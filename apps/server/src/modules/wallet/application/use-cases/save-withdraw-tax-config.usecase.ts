import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  WithdrawTaxConfigView,
  WithdrawTaxTier,
  sanitizeWithdrawTaxTiers,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { GetWithdrawTaxConfigUseCase } from './get-withdraw-tax-config.usecase';

/**
 * 用例：保存税务配置（提现阶梯税费档位）。
 * 档位经 sanitize 规整（升序去重）后写入配置中心 wallet.withdrawTaxTiers；
 * 起始金额重复视为入参错误，空数组表示清空阶梯（回退单一费率）。
 */
@Injectable()
export class SaveWithdrawTaxConfigUseCase {
  constructor(
    private readonly config: ConfigService,
    private readonly getConfig: GetWithdrawTaxConfigUseCase,
  ) {}

  async execute(tiers: WithdrawTaxTier[]): Promise<WithdrawTaxConfigView> {
    const sanitized = sanitizeWithdrawTaxTiers(tiers);
    if (sanitized.length !== tiers.length) {
      throw new BadRequestException('档位起始金额不能重复');
    }
    await this.config.setJson(CONFIG_KEYS.wallet.withdrawTaxTiers, sanitized);
    return this.getConfig.execute();
  }
}
