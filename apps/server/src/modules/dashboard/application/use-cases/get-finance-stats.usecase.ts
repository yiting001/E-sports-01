import { Inject, Injectable } from '@nestjs/common';
import {
  FinanceStatsView,
  StatsRange,
  WALLET_TXN_TYPE_TEXT,
  WalletTxnType,
} from '@app/contracts';
import {
  STATS_REPOSITORY,
  StatsRepository,
} from '../../domain/stats-repository.interface';
import { resolveRange } from '../range.util';

/** 用例：财务资金统计（各流水类型金额合计 + 收支趋势） */
@Injectable()
export class GetFinanceStatsUseCase {
  constructor(
    @Inject(STATS_REPOSITORY) private readonly stats: StatsRepository,
  ) {}

  async execute(range: StatsRange): Promise<FinanceStatsView> {
    const spec = resolveRange(range);
    const [typeTotals, flowRows] = await Promise.all([
      this.stats.txnTypeTotals(spec),
      this.stats.flowTrend(spec),
    ]);
    const totalOf = (type: WalletTxnType): number =>
      typeTotals.find((row) => row.type === type)?.totalFen ?? 0;
    const flowMap = new Map(flowRows.map((row) => [row.bucket, row]));
    return {
      rechargeFen: totalOf(WalletTxnType.Recharge),
      withdrawFen: totalOf(WalletTxnType.Withdraw),
      commissionFen: totalOf(WalletTxnType.Commission),
      penaltyFen: totalOf(WalletTxnType.Penalty),
      depositFen: totalOf(WalletTxnType.Deposit),
      depositRefundFen: totalOf(WalletTxnType.DepositRefund),
      flowTrend: spec.buckets.map((bucket) => ({
        bucket,
        inFen: flowMap.get(bucket)?.inFen ?? 0,
        outFen: flowMap.get(bucket)?.outFen ?? 0,
      })),
      typeDistribution: typeTotals
        .filter((row) => row.totalFen > 0)
        .map((row) => ({
          name: WALLET_TXN_TYPE_TEXT[row.type as WalletTxnType] ?? row.type,
          count: row.totalFen,
        })),
    };
  }
}
