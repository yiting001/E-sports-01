import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePenaltyBody, PenaltyView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_FINANCE_SETTLEMENT,
  BoosterFinanceSettlement,
} from '../../domain/booster-finance-settlement.interface';
import { toPenaltyView } from '../penalty.mapper';

/**
 * 用例：财务对打手创建罚款。
 * 来源为余额时经原子结算端口记 penalty 出账流水（余额不足由账务单元拒绝）；
 * 来源为押金时直接核减已缴押金（押金由平台代管，无需走钱包）。
 * 罚款记录留档：金额、来源、理由、关联订单号、操作人。
 */
@Injectable()
export class CreatePenaltyUseCase {
  constructor(
    @Inject(BOOSTER_FINANCE_SETTLEMENT)
    private readonly settlement: BoosterFinanceSettlement,
    private readonly users: UserDirectory,
  ) {}

  async execute(operatorId: string, payload: CreatePenaltyBody): Promise<PenaltyView> {
    const reason = payload.reason.trim();
    if (!reason) {
      throw new BadRequestException('罚款理由不能为空');
    }
    const result = await this.settlement.createPenalty({
      operatorId,
      boosterUserId: payload.boosterUserId,
      orderNo: payload.orderNo?.trim() ?? '',
      amountFen: payload.amountFen,
      source: payload.source,
      reason,
    });
    if (result.outcome === 'booster_not_found') {
      throw new NotFoundException('该用户不是入驻打手');
    }
    if (result.outcome === 'insufficient_deposit') {
      throw new BadRequestException('押金余额不足，无法从押金扣除');
    }
    if (result.outcome === 'wallet_not_found') {
      throw new NotFoundException('打手钱包不存在');
    }
    if (result.outcome === 'insufficient_balance') {
      throw new BadRequestException('余额不足，无法扣减');
    }
    const saved = result.penalty;
    const profiles = await this.users.resolveProfiles([saved.boosterUserId]);
    return toPenaltyView(saved, profiles.get(saved.boosterUserId));
  }
}
