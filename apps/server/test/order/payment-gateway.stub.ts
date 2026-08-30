import type { PaymentProvider } from '@app/contracts';
import type { PaymentGatewayService } from '../../src/modules/wallet/application/payment-gateway.service';

/** 直通网关桩：不做渠道切换，官方渠道原样返回，用于聚焦被测用例自身逻辑 */
export function passthroughPaymentGateway(): PaymentGatewayService {
  return {
    resolvePaymentProvider: async (provider: PaymentProvider) => provider,
    resolveRefundProvider: async (provider: PaymentProvider) => provider,
  } as unknown as PaymentGatewayService;
}
