import { Inject, Injectable } from '@nestjs/common';
import { BoosterFundsView } from '@app/contracts';
import { WalletFinanceReadService } from '../../../wallet/application/wallet-finance-read.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import {
  BOOSTER_PENALTY_REPOSITORY,
  BoosterPenaltyRepository,
} from '../../domain/penalty-repository.interface';

/**
 * 用例：获取当前打手「我的资金」聚合视图。
 * 只读聚合：押金取入驻记录，余额/冻结/提成结算取钱包财务快照，罚款取罚款记录合计；
 * 未入驻或未开通钱包时对应项按零值返回，不产生任何写入。
 */
@Injectable()
export class GetMyBoosterFundsUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly boosterRepo: BoosterRepository,
    @Inject(BOOSTER_PENALTY_REPOSITORY)
    private readonly penaltyRepo: BoosterPenaltyRepository,
    private readonly walletFinance: WalletFinanceReadService,
  ) {}

  async execute(userId: string): Promise<BoosterFundsView> {
    const [record, snapshot, penaltyPaidFen] = await Promise.all([
      this.boosterRepo.findByUserId(userId),
      this.walletFinance.getFundsSnapshot(userId),
      this.penaltyRepo.sumByBoosterUserId(userId),
    ]);
    return {
      depositFen: record?.depositFen ?? 0,
      balanceFen: snapshot.balanceFen,
      frozenFen: snapshot.frozenFen,
      totalCommissionFen: snapshot.totalCommissionFen,
      monthCommissionFen: snapshot.monthCommissionFen,
      lastMonthCommissionFen: snapshot.lastMonthCommissionFen,
      penaltyPaidFen,
    };
  }
}
