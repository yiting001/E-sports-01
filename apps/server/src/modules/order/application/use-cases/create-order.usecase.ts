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
import { OrderPaymentSettleService } from '../order-payment.service';

/** 0 元单免支付落账时的渠道单号占位 */
const ZERO_AMOUNT_TRADE_NO = 'ZERO_AMOUNT';

/**
 * 用例：创建服务订单并发起扫码支付。
 * 校验商品在架 → 按会员等级折扣、可选优惠券抵扣固化原价/折扣/抵扣/实付快照
 * → 落订单(待付款)并核销用券 → 调支付渠道下单取二维码。
 * 抵扣到 0 元的订单免真实支付，直接走唯一落账口标记已支付。
 * 非 0 元单真正标记已支付在异步回调/主动查单完成。
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
    private readonly settle: OrderPaymentSettleService,
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

    // 优惠券抵扣：在会员折后价上再抵扣，最多抵到 0 元（0 元单免真实支付）
    let couponDeductionFen = 0;
    if (payload.userCouponId) {
      const deduction = await this.couponRedeem.resolveDeduction(
        userId,
        payload.userCouponId,
        memberAmountFen,
      );
      couponDeductionFen = Math.min(Math.max(deduction, 0), memberAmountFen);
    }
    const amountFen = memberAmountFen - couponDeductionFen;
    if (amountFen < 0 || couponDeductionFen < 0) {
      throw new BadRequestException('订单金额异常');
    }

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
        remarkMedia: payload.remarkMedia ?? [],
        accountInfo: payload.accountInfo?.trim() ?? '',
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

    // 0 元单：不调支付渠道，直接走唯一落账口标记已支付（幂等）
    if (amountFen === 0) {
      await this.settle.markPaid(orderNo, ZERO_AMOUNT_TRADE_NO, 0);
      return {
        orderId: saved.id,
        orderNo,
        provider: payload.provider,
        qrCode: '',
        paid: true,
        amountFen,
        amountYuan: fenToYuan(amountFen),
        originalAmountFen,
        discountBp: memberTier.discountBp,
        couponDeductionFen,
      };
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
      paid: false,
      amountFen,
      amountYuan: fenToYuan(amountFen),
      originalAmountFen,
      discountBp: memberTier.discountBp,
      couponDeductionFen,
    };
  }
}
