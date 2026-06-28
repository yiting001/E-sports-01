import { Inject, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@app/contracts';
import { WALLET_LEDGER, WalletLedger } from '../../domain/ledger.interface';
import { PaymentCallbackRequest } from '../../domain/payment-port.interface';
import { PaymentResolver } from '../payment.resolver';

/**
 * 用例：处理充值异步回调。
 * 按渠道验签并解析回调 → 支付成功则交由账务单元幂等入账 → 返回应答给渠道的报文。
 */
@Injectable()
export class HandleRechargeCallbackUseCase {
  constructor(
    private readonly paymentResolver: PaymentResolver,
    @Inject(WALLET_LEDGER) private readonly ledger: WalletLedger,
  ) {}

  async execute(
    provider: PaymentProvider,
    req: PaymentCallbackRequest,
  ): Promise<string> {
    const port = this.paymentResolver.resolve(provider);
    const result = await port.parseCallback(req);
    if (result.success) {
      await this.ledger.creditRecharge({
        outTradeNo: result.outTradeNo,
        providerTradeNo: result.providerTradeNo,
        paidAmountFen: result.paidAmountFen,
      });
    }
    return port.callbackAck();
  }
}
