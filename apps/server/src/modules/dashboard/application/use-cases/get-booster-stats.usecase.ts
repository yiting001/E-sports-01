import { Inject, Injectable } from '@nestjs/common';
import { BoosterStatsView, StatsRange } from '@app/contracts';
import { BoosterPolicyService } from '../../../booster/application/booster-policy.service';
import {
  STATS_REPOSITORY,
  StatsRepository,
} from '../../domain/stats-repository.interface';
import { fillTrend, resolveRange } from '../range.util';

/** 用例：打手生态统计（入驻申请趋势 + 等级分布） */
@Injectable()
export class GetBoosterStatsUseCase {
  constructor(
    @Inject(STATS_REPOSITORY) private readonly stats: StatsRepository,
    private readonly boosterPolicy: BoosterPolicyService,
  ) {}

  async execute(range: StatsRange): Promise<BoosterStatsView> {
    const spec = resolveRange(range);
    const [totals, applicationTrend, levelDistribution] = await Promise.all([
      this.stats.boosterTotals(spec),
      this.stats.applicationTrend(spec),
      this.levelDistribution(),
    ]);
    return {
      ...totals,
      applicationTrend: fillTrend(spec.buckets, applicationTrend),
      levelDistribution,
    };
  }

  /** 按配置档位统计打手等级分布：每档人数 = 完成单数落在 [本档门槛, 下一档门槛) 的已入驻打手数 */
  private async levelDistribution(): Promise<{ name: string; count: number }[]> {
    const tiers = await this.boosterPolicy.getLevelTiers();
    const sorted = tiers.slice().sort((a, b) => a.minCompletedOrders - b.minCompletedOrders);
    return Promise.all(
      sorted.map(async (tier, index) => ({
        name: tier.name,
        count: await this.stats.countBoostersByCompleted(
          tier.minCompletedOrders,
          sorted[index + 1]?.minCompletedOrders ?? null,
        ),
      })),
    );
  }
}
