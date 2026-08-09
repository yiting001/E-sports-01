import { Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  WALLET_DEFAULTS,
  WithdrawTaxConfigView,
  WithdrawTaxTier,
  sanitizeWithdrawTaxTiers,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';

/** 用例：读取税务配置（提现阶梯税费档位 + 回退单一费率），供管理端税务管理页展示 */
@Injectable()
export class GetWithdrawTaxConfigUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(): Promise<WithdrawTaxConfigView> {
    const tiers = sanitizeWithdrawTaxTiers(
      await this.config.getJson<WithdrawTaxTier[]>(CONFIG_KEYS.wallet.withdrawTaxTiers, []),
    );
    const fallbackRateBp = await this.config.getNumber(
      CONFIG_KEYS.wallet.withdrawFeeRateBp,
      WALLET_DEFAULTS.withdrawFeeRateBp,
    );
    return { tiers, fallbackRateBp };
  }
}
