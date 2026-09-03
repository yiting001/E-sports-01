import { Injectable, NotImplementedException } from '@nestjs/common';
import { PayoutProvider } from '@app/contracts';
import {
  PayoutCallbackResult,
  PayoutPort,
  PayoutResult,
} from '../../domain/payout-port.interface';

/** 统一的未开通提示 */
const NOT_AVAILABLE = '微信官方提现暂未开通，请开启计全付提现网关或改用支付宝提现';

/**
 * 微信官方提现驱动（预留位）。
 * 微信零钱提现当前通过计全付转账（JqfWechatTransferDriver）实现；
 * 官方「商家转账到零钱」保留策略占位，被选用时如实抛出未开通，避免误用。
 */
@Injectable()
export class WechatPayoutDriver implements PayoutPort {
  readonly provider = PayoutProvider.Wechat;
  readonly available = false;
  readonly supportsCallback = false;

  transfer(): Promise<PayoutResult> {
    throw new NotImplementedException(NOT_AVAILABLE);
  }

  queryTransfer(): Promise<PayoutResult> {
    throw new NotImplementedException(NOT_AVAILABLE);
  }

  parseCallback(): Promise<PayoutCallbackResult> {
    throw new NotImplementedException(NOT_AVAILABLE);
  }

  callbackAck(): string {
    return '';
  }
}
