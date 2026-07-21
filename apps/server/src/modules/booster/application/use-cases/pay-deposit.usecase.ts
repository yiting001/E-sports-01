import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { BoosterView, fenToYuan } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_FINANCE_SETTLEMENT,
  BoosterFinanceSettlement,
} from '../../domain/booster-finance-settlement.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';

/**
 * 用例：打手缴纳押金（区间内自选金额）。
 * 仅已通过入驻审核的打手可缴；缴后累计不得超过配置的最高交付额，
 * 从钱包余额扣除，经原子结算端口记 deposit 出账流水（余额不足由账务单元拒绝）。
 */
@Injectable()
export class PayDepositUseCase {
  constructor(
    @Inject(BOOSTER_FINANCE_SETTLEMENT)
    private readonly settlement: BoosterFinanceSettlement,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
  ) {}

  async execute(userId: string, amountFen: number): Promise<BoosterView> {
    const { maxFen } = await this.policy.getDepositPolicy();
    const result = await this.settlement.payDeposit({ userId, amountFen, maxFen });
    if (result.outcome === 'not_approved') {
      throw new ConflictException('请先通过打手入驻审核');
    }
    if (result.outcome === 'maximum_reached') {
      throw new ConflictException('押金已达最高交付额，无需继续缴纳');
    }
    if (result.outcome === 'maximum_exceeded') {
      throw new BadRequestException(
        `缴后累计不得超过最高交付额 ${fenToYuan(maxFen)} 元，本次最多可缴 ${fenToYuan(
          result.availableFen,
        )} 元`,
      );
    }
    if (result.outcome === 'wallet_not_found') {
      throw new ConflictException('钱包初始化失败，请重试');
    }
    if (result.outcome === 'insufficient_balance') {
      throw new BadRequestException('余额不足，无法扣减');
    }
    const saved = result.booster;
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(userId));
  }
}
