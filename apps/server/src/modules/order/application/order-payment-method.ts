import { OrderPaymentMethod, PaymentProvider } from '@app/contracts';

/** 订单支付方式转换为可复用的钱包收款渠道；余额支付不走渠道驱动。 */
export function toPaymentProvider(method: OrderPaymentMethod): PaymentProvider | null {
  switch (method) {
    case OrderPaymentMethod.Alipay:
      return PaymentProvider.Alipay;
    case OrderPaymentMethod.Wechat:
      return PaymentProvider.Wechat;
    case OrderPaymentMethod.WechatJsapi:
      return PaymentProvider.WechatJsapi;
    case OrderPaymentMethod.Balance:
      return null;
  }
}

/**
 * 订单支付方式转换为退款渠道。
 * JSAPI 与 Native 共用微信商户号，退款统一走微信商户退款驱动。
 */
export function toRefundProvider(method: OrderPaymentMethod): PaymentProvider | null {
  const provider = toPaymentProvider(method);
  return provider === PaymentProvider.WechatJsapi ? PaymentProvider.Wechat : provider;
}

/** 渠道回调转换为订单支付方式（计全付渠道回归对应官方支付方式，订单不感知网关）。 */
export function toOrderPaymentMethod(provider: PaymentProvider): OrderPaymentMethod {
  switch (provider) {
    case PaymentProvider.Alipay:
    case PaymentProvider.JqfAlipay:
      return OrderPaymentMethod.Alipay;
    case PaymentProvider.Wechat:
    case PaymentProvider.JqfWechat:
      return OrderPaymentMethod.Wechat;
    case PaymentProvider.WechatJsapi:
    case PaymentProvider.JqfWechatJsapi:
      return OrderPaymentMethod.WechatJsapi;
  }
}
