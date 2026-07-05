/** 打手榜聚合行（用户展示名 + 完成单数） */
export interface BoosterRankRow {
  name: string;
  completedCount: number;
}

/** 消费榜聚合行（用户展示名 + 累计消费分） */
export interface SpenderRankRow {
  name: string;
  spendFen: number;
}

/** 排行榜仓储注入令牌 */
export const RANK_REPOSITORY = Symbol('RANK_REPOSITORY');

/** 排行榜仓储端口（对既有业务表只读聚合，领域层只依赖此抽象） */
export interface RankRepository {
  /** 打手榜：按完成单数倒序取前 limit 名 */
  topBoosters(limit: number): Promise<BoosterRankRow[]>;
  /** 消费榜：按累计消费倒序取前 limit 名 */
  topSpenders(limit: number): Promise<SpenderRankRow[]>;
}
