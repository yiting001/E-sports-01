import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BoosterView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_FINANCE_SETTLEMENT,
  BoosterFinanceSettlement,
} from '../../domain/booster-finance-settlement.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';

/**
 * 用例：管理端退还打手押金。
 * 已缴押金全额退回打手钱包余额，经原子结算端口记 deposit_refund 入账流水。
 */
@Injectable()
export class RefundDepositUseCase {
  constructor(
    @Inject(BOOSTER_FINANCE_SETTLEMENT)
    private readonly settlement: BoosterFinanceSettlement,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
  ) {}

  async execute(id: string): Promise<BoosterView> {
    const result = await this.settlement.refundDeposit(id);
    if (result.outcome === 'not_found') {
      throw new NotFoundException('入驻申请不存在');
    }
    if (result.outcome === 'empty') {
      throw new ConflictException('该打手暂无可退押金');
    }
    if (result.outcome === 'wallet_not_found') {
      throw new ConflictException('钱包初始化失败，请重试');
    }
    const saved = result.booster;
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([saved.userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(saved.userId));
  }
}
