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
import { MemberLevelService } from '../../../member/application/member-level.service';
import { PaymentResolver } from '../../../wallet/application/payment.resolver';
import { buildOrderNo } from '../../../wallet/application/order-no.util';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';

/**
 * 用例：创建服务订单并发起扫码支付。
 * 校验商品在架 → 按会员等级折扣固化原价/折扣/实付快照 → 落订单(待付款)
 * → 调支付渠道下单取二维码。真正标记已支付在异步回调用例完成。
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
    const amountFen = calcDiscountedFen(
      originalAmountFen,
      memberTier.discountBp,
    );

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
        provider: payload.provider,
        status: OrderStatus.PendingPayment,
        remark: payload.remark?.trim() ?? '',
        providerTradeNo: null,
        paidAt: null,
      }),
    );

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
    };
  }
}
