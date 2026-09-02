import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CONFIG_KEYS,
  CreateOrderPayload,
  CreateOrderResult,
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderStatus,
  ProductStatus,
  WechatJsapiPayParams,
  calcDiscountedFen,
  fenToYuan,
  resolveProductPrice,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../../commerce/domain/product-repository.interface';
import { CouponRedeemService } from '../../../coupon/application/coupon-redeem.service';
import {
  BoosterSelectionService,
  SelectedBoosterSnapshot,
} from '../../../booster/application/booster-selection.service';
import { MemberLevelService } from '../../../member/application/member-level.service';
import { PaymentGatewayService } from '../../../wallet/application/payment-gateway.service';
import { PaymentResolver } from '../../../wallet/application/payment.resolver';
import { WechatJsapiPayerService } from '../../../wallet/application/wechat-jsapi-payer.service';
import { buildOrderNo } from '../../../wallet/application/order-no.util';
import { buildPayReturnUrl } from '../../../wallet/application/pay-return-url';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import { toPaymentProvider } from '../order-payment-method';
import { OrderPaymentSettleService } from '../order-payment.service';

/** 0 元单免支付落账时的渠道单号占位 */
const ZERO_AMOUNT_TRADE_NO = 'ZERO_AMOUNT';

/**
 * 用例：创建服务订单并发起扫码支付。
 * 校验商品在架 → 按会员等级折扣、可选优惠券抵扣固化原价/折扣/抵扣/实付快照
 * → 落订单(待付款)并核销用券 → 调支付渠道下单取二维码/JSAPI 参数（前端传 returnUrl 时追加订单标识后透传）。
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
    private readonly paymentGateway: PaymentGatewayService,
    private readonly config: ConfigService,
    private readonly memberLevels: MemberLevelService,
    private readonly couponRedeem: CouponRedeemService,
    private readonly settle: OrderPaymentSettleService,
    private readonly boosterSelection: BoosterSelectionService,
    private readonly jsapiPayer: WechatJsapiPayerService,
  ) {}

  async execute(userId: string, payload: CreateOrderPayload): Promise<CreateOrderResult> {
    const product = await this.products.findById(payload.productId);
    if (!product || product.status !== ProductStatus.OnShelf) {
      throw new NotFoundException('商品不存在或已下架');
    }
    const requestedBooster = await this.resolveRequestedBooster(userId, payload);
    const unitPrice = resolveProductPrice(product, payload.serviceRegion);
    const originalAmountFen = unitPrice.priceFen * payload.quantity;
    if (originalAmountFen <= 0) {
      throw new BadRequestException('订单金额异常');
    }
    const memberTier = await this.memberLevels.resolveForUser(userId);
    const memberAmountFen = calcDiscountedFen(originalAmountFen, memberTier.discountBp);

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

    const baseProvider = toPaymentProvider(payload.provider);
    const channelProvider = baseProvider
      ? await this.paymentGateway.resolvePaymentProvider(baseProvider)
      : null;
    const port = channelProvider ? this.paymentResolver.resolve(channelProvider) : null;
    const payerOpenid =
      payload.provider === OrderPaymentMethod.WechatJsapi
        ? await this.jsapiPayer.resolveOpenid(userId)
        : undefined;
    const orderNo = buildOrderNo('O');

    const saved = await this.orders.save(
      this.orders.create({
        userId,
        orderNo,
        productId: product.id,
        productTitle: product.title,
        productCover: product.cover,
        serviceAgentId: product.serviceAgentId,
        requestedBoosterId: requestedBooster?.userId ?? '',
        requestedBoosterName: requestedBooster?.displayName ?? '',
        boosterSelectionMode: payload.boosterSelectionMode,
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
        gameAccountId: payload.gameAccountId.trim(),
        gameTextId: payload.gameTextId?.trim() ?? '',
        serviceRegion: payload.serviceRegion,
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
        saved.cancelledAt = new Date();
        await this.orders.save(saved);
        throw err;
      }
    }

    // 0 元单：不调支付渠道，直接走唯一落账口标记已支付（幂等）
    if (amountFen === 0) {
      try {
        await this.settle.markPaid(orderNo, payload.provider, ZERO_AMOUNT_TRADE_NO, 0);
      } catch (error) {
        await this.compensateFailedCreation(saved.id);
        throw error;
      }
      return {
        orderId: saved.id,
        orderNo,
        provider: payload.provider,
        qrCode: '',
        jsapiParams: null,
        paid: true,
        amountFen,
        amountYuan: fenToYuan(amountFen),
        originalAmountFen,
        discountBp: memberTier.discountBp,
        couponDeductionFen,
      };
    }

    // 余额支付不创建渠道二维码；事务内扣款成功即直接完成支付。
    if (!port) {
      try {
        await this.settle.payWithBalance(saved.id, userId, amountFen);
      } catch (error) {
        await this.compensateFailedCreation(saved.id);
        throw error;
      }
      return {
        orderId: saved.id,
        orderNo,
        provider: payload.provider,
        qrCode: '',
        jsapiParams: null,
        paid: true,
        amountFen,
        amountYuan: fenToYuan(amountFen),
        originalAmountFen,
        discountBp: memberTier.discountBp,
        couponDeductionFen,
      };
    }

    let qrCode: string;
    let jsapiParams: WechatJsapiPayParams | null = null;
    try {
      const notifyBaseUrl = await this.config.getString(CONFIG_KEYS.wallet.notifyBaseUrl, '');
      const result = await port.createRecharge({
        outTradeNo: orderNo,
        amountFen,
        subject: product.title,
        notifyUrl: notifyBaseUrl ? `${notifyBaseUrl}/order/pay/callback/${port.provider}` : '',
        returnUrl: buildPayReturnUrl(payload.returnUrl, saved.id),
        payerOpenid,
      });
      qrCode = result.qrCode;
      jsapiParams = result.jsapiParams ?? null;
    } catch (error) {
      await this.compensateFailedCreation(saved.id);
      throw error;
    }

    return {
      orderId: saved.id,
      orderNo,
      provider: payload.provider,
      qrCode,
      jsapiParams,
      paid: false,
      amountFen,
      amountYuan: fenToYuan(amountFen),
      originalAmountFen,
      discountBp: memberTier.discountBp,
      couponDeductionFen,
    };
  }

  private async resolveRequestedBooster(
    userId: string,
    payload: CreateOrderPayload,
  ): Promise<SelectedBoosterSnapshot | null> {
    const requestedId = payload.requestedBoosterId?.trim() ?? '';
    if (payload.boosterSelectionMode === OrderBoosterSelectionMode.Auto) {
      if (requestedId) {
        throw new BadRequestException('自动安排不能同时指定打手');
      }
      return null;
    }
    if (!requestedId) {
      throw new BadRequestException('请选择要指定的打手');
    }
    return this.boosterSelection.assertSelectable(userId, requestedId, payload.serviceRegion);
  }

  /** 支付未落账时作废新订单，并回退该订单已经核销的优惠券。 */
  private async compensateFailedCreation(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order || order.status !== OrderStatus.PendingPayment) {
      return;
    }
    const cancelled = await this.orders.claimForCancellation({
      orderId: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      cancelledAt: new Date(),
    });
    if (!cancelled) {
      return;
    }
    if (cancelled.userCouponId) {
      await this.couponRedeem.restoreByOrder(cancelled.id);
    }
  }
}
