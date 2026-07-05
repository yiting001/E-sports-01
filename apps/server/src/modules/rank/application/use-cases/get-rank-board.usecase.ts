import { Inject, Injectable } from '@nestjs/common';
import { RANK_TOP_LIMIT, RankBoardView, RankEntryView } from '@app/contracts';
import {
  RANK_REPOSITORY,
  RankRepository,
} from '../../domain/rank-repository.interface';
import { maskDisplayName } from '../name-mask.util';

/** 用例：查询排行榜（打手榜 + 消费榜，昵称脱敏保护隐私） */
@Injectable()
export class GetRankBoardUseCase {
  constructor(
    @Inject(RANK_REPOSITORY)
    private readonly repo: RankRepository,
  ) {}

  async execute(): Promise<RankBoardView> {
    const [boosters, spenders] = await Promise.all([
      this.repo.topBoosters(RANK_TOP_LIMIT),
      this.repo.topSpenders(RANK_TOP_LIMIT),
    ]);
    return {
      boosters: boosters.map(
        (row, index): RankEntryView => ({
          rank: index + 1,
          name: maskDisplayName(row.name),
          value: row.completedCount,
        }),
      ),
      spenders: spenders.map(
        (row, index): RankEntryView => ({
          rank: index + 1,
          name: maskDisplayName(row.name),
          value: row.spendFen,
        }),
      ),
    };
  }
}
