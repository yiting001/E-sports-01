import { Inject, Injectable } from '@nestjs/common';
import { StatsRange, UserStatsView } from '@app/contracts';
import { MemberLevelService } from '../../../member/application/member-level.service';
import {
  STATS_REPOSITORY,
  StatsRepository,
} from '../../domain/stats-repository.interface';
import { fillTrend, resolveRange } from '../range.util';

/** 用例：用户增长统计（注册趋势 + 会员等级分布） */
@Injectable()
export class GetUserStatsUseCase {
  constructor(
    @Inject(STATS_REPOSITORY) private readonly stats: StatsRepository,
    private readonly memberLevel: MemberLevelService,
  ) {}

  async execute(range: StatsRange): Promise<UserStatsView> {
    const spec = resolveRange(range);
    const [totalUsers, newUsers, userTrend, memberLevelDistribution] = await Promise.all([
      this.stats.totalUsers(),
      this.stats.newUsers(spec),
      this.stats.userTrend(spec),
      this.levelDistribution(),
    ]);
    return {
      totalUsers,
      newUsers,
      userTrend: fillTrend(spec.buckets, userTrend),
      memberLevelDistribution,
    };
  }

  /** 按配置档位统计会员等级分布：每档人数 = 消费落在 [本档门槛, 下一档门槛) 的会员数 */
  private async levelDistribution(): Promise<{ name: string; count: number }[]> {
    const tiers = await this.memberLevel.getTiers();
    const sorted = tiers.slice().sort((a, b) => a.minSpendFen - b.minSpendFen);
    return Promise.all(
      sorted.map(async (tier, index) => ({
        name: tier.name,
        count: await this.stats.countMembersBySpend(
          tier.minSpendFen,
          sorted[index + 1]?.minSpendFen ?? null,
        ),
      })),
    );
  }
}
