import { OrderPaymentMethod, PaymentProvider } from '@app/contracts';

/** 订单支付方式转换为可复用的钱包收款渠道；余额支付不走渠道驱动。 */
export function toPaymentProvider(method: OrderPaymentMethod): PaymentProvider | null {
  switch (method) {
    case OrderPaymentMethod.Alipay:
      return PaymentProvider.Alipay;
    case OrderPaymentMethod.Wechat:
      return PaymentProvider.Wechat;
    case OrderPaymentMethod.Balance:
      return null;
  }
}

/** 渠道回调转换为订单支付方式。 */
export function toOrderPaymentMethod(provider: PaymentProvider): OrderPaymentMethod {
  switch (provider) {
    case PaymentProvider.Alipay:
      return OrderPaymentMethod.Alipay;
    case PaymentProvider.Wechat:
      return OrderPaymentMethod.Wechat;
  }
}
