import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CONFIG_KEYS,
  CreateOrderPayload,
  CreateOrderResult,
  OrderStatus,
  ProductStatus,
  calcDiscountedFen,
  fenToYuan,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../../commerce/domain/product-repository.interface';
import { CouponRedeemService } from '../../../coupon/application/coupon-redeem.service';
import { MemberLevelService } from '../../../member/application/member-level.service';
import { PaymentResolver } from '../../../wallet/application/payment.resolver';
import { buildOrderNo } from '../../../wallet/application/order-no.util';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';

/**
 * 用例：创建服务订单并发起扫码支付。
 * 校验商品在架 → 按会员等级折扣、可选优惠券抵扣固化原价/折扣/抵扣/实付快照
 * → 落订单(待付款)并核销用券 → 调支付渠道下单取二维码。
 * 真正标记已支付在异步回调/主动查单完成。
 */
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
    private readonly paymentResolver: PaymentResolver,
    private readonly config: ConfigService,
    private readonly memberLevels: MemberLevelService,
    private readonly couponRedeem: CouponRedeemService,
  ) {}

  async execute(
    userId: string,
    payload: CreateOrderPayload,
  ): Promise<CreateOrderResult> {
    const product = await this.products.findById(payload.productId);
    if (!product || product.status !== ProductStatus.OnShelf) {
      throw new NotFoundException('商品不存在或已下架');
    }
    const originalAmountFen = product.priceFen * payload.quantity;
    if (originalAmountFen <= 0) {
      throw new BadRequestException('订单金额异常');
    }
    const memberTier = await this.memberLevels.resolveForUser(userId);
    const memberAmountFen = calcDiscountedFen(
      originalAmountFen,
      memberTier.discountBp,
    );

    // 优惠券抵扣：在会员折后价上再抵扣，实付至少保留 1 分（渠道要求金额 > 0）
    let couponDeductionFen = 0;
    if (payload.userCouponId) {
      const deduction = await this.couponRedeem.resolveDeduction(
        userId,
        payload.userCouponId,
        memberAmountFen,
      );
      couponDeductionFen = Math.min(deduction, memberAmountFen - 1);
    }
    const amountFen = memberAmountFen - couponDeductionFen;

    const port = this.paymentResolver.resolve(payload.provider);
    const orderNo = buildOrderNo('O');

    const saved = await this.orders.save(
      this.orders.create({
        userId,
        orderNo,
        productId: product.id,
        productTitle: product.title,
        productCover: product.cover,
        serviceAgentId: product.serviceAgentId,
        quantity: payload.quantity,
        amountFen,
        originalAmountFen,
        discountBp: memberTier.discountBp,
        userCouponId: payload.userCouponId ?? null,
        couponDeductionFen,
        provider: payload.provider,
        status: OrderStatus.PendingPayment,
        remark: payload.remark?.trim() ?? '',
        providerTradeNo: null,
        paidAt: null,
      }),
    );

    // 条件核销防并发重复用券；核销失败则作废订单后抛出
    if (payload.userCouponId) {
      try {
        await this.couponRedeem.redeem(payload.userCouponId, saved.id);
      } catch (err) {
        saved.status = OrderStatus.Cancelled;
        await this.orders.save(saved);
        throw err;
      }
    }

    const notifyBaseUrl = await this.config.getString(
      CONFIG_KEYS.wallet.notifyBaseUrl,
      '',
    );
    const { qrCode } = await port.createRecharge({
      outTradeNo: orderNo,
      amountFen,
      subject: product.title,
      notifyUrl: notifyBaseUrl
        ? `${notifyBaseUrl}/order/pay/callback/${payload.provider}`
        : '',
    });

    return {
      orderId: saved.id,
      orderNo,
      provider: payload.provider,
      qrCode,
      amountFen,
      amountYuan: fenToYuan(amountFen),
      originalAmountFen,
      discountBp: memberTier.discountBp,
      couponDeductionFen,
    };
  }
}
