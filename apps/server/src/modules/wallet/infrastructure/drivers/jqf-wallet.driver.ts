import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { JQF_WALLET_CHANNEL_STATE } from '../../domain/jqf-wallet-account.entity';
import {
  JqfWalletOpenPort,
  JqfWalletOpenRequest,
  JqfWalletOpenResult,
} from '../../domain/jqf-wallet-open-port.interface';
import { JqfPayConfigFactory } from './jqf-pay.config';
import { postJqf } from './jqf-pay.request';

/** 钱包能力走 hnawalletpay 渠道，开户接口要求 2.0 版本报文 */
export const JQF_WALLET_IF_CODE = 'hnawalletpay';
const JQF_WALLET_CREATE_VERSION = '2.0';

function toWalletResult(data: Record<string, unknown>): JqfWalletOpenResult {
  const state = Number(data.channelState);
  return {
    walletId: typeof data.walletId === 'string' ? data.walletId : '',
    channelState: Number.isInteger(state)
      ? state
      : JQF_WALLET_CHANNEL_STATE.notOpened,
    errMsg: typeof data.errMsg === 'string' ? data.errMsg : '',
  };
}

/** 计全付钱包渠道适配器：创建钱包用户（开户）与按 walletId 查询渠道状态 */
@Injectable()
export class JqfWalletDriver implements JqfWalletOpenPort {
  constructor(private readonly configFactory: JqfPayConfigFactory) {}

  async isConfigured(): Promise<boolean> {
    try {
      await this.configFactory.load();
      return true;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        return false;
      }
      throw error;
    }
  }

  async openWallet(request: JqfWalletOpenRequest): Promise<JqfWalletOpenResult> {
    const cfg = await this.configFactory.load();
    const data = await postJqf(
      cfg,
      'api/wallet/user',
      {
        mchOrderNo: request.mchOrderNo,
        ifCode: JQF_WALLET_IF_CODE,
        idcardNo: request.idcardNo,
        idcardName: request.idcardName,
        telphone: request.telphone,
      },
      JQF_WALLET_CREATE_VERSION,
    );
    return toWalletResult(data);
  }

  async queryWallet(walletId: string): Promise<JqfWalletOpenResult> {
    const cfg = await this.configFactory.load();
    const data = await postJqf(cfg, 'api/wallet/user/query', { walletId }, JQF_WALLET_CREATE_VERSION);
    return toWalletResult(data);
  }
}
