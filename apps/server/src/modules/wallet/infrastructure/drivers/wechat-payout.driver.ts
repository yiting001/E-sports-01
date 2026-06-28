import { Injectable, NotImplementedException } from '@nestjs/common';
import { PayoutProvider } from '@app/contracts';
import { PayoutPort, PayoutResult } from '../../domain/payout-port.interface';

/**
 * 微信提现驱动（预留位）。
 * 按需求微信提现暂不开通，保留策略占位以便后续接入「商家转账到零钱」，
 * 当前被选用时如实抛出未开通，避免误用。
 */
@Injectable()
export class WechatPayoutDriver implements PayoutPort {
  readonly provider = PayoutProvider.Wechat;
  readonly available = false;

  transfer(): Promise<PayoutResult> {
    throw new NotImplementedException('微信提现暂未开通，请改用支付宝提现');
  }
}
