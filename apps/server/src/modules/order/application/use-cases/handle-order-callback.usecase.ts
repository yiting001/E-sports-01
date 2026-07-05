import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@app/contracts';
import { PaymentCallbackRequest } from '../../../wallet/domain/payment-port.interface';
import { PaymentResolver } from '../../../wallet/application/payment.resolver';
import { OrderPaymentSettleService } from '../order-payment.service';

/**
 * 用例：处理订单支付异步回调。
 * 按渠道验签解析 → 支付成功则经 OrderPaymentSettleService 幂等落账
 * （与主动查单共用同一落账口）；重复回调直接应答成功。
 */
@Injectable()
export class HandleOrderCallbackUseCase {
  constructor(
    private readonly paymentResolver: PaymentResolver,
    private readonly settle: OrderPaymentSettleService,
  ) {}

  async execute(
    provider: PaymentProvider,
    req: PaymentCallbackRequest,
  ): Promise<string> {
    const port = this.paymentResolver.resolve(provider);
    const result = await port.parseCallback(req);
    if (result.success) {
      await this.settle.markPaid(
        result.outTradeNo,
        result.providerTradeNo,
        result.paidAmountFen,
      );
    }
    return port.callbackAck();
  }
}
