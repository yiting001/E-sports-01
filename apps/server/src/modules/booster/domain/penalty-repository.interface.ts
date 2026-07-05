import { BoosterPenaltyEntity } from './booster-penalty.entity';

export const BOOSTER_PENALTY_REPOSITORY = Symbol('BOOSTER_PENALTY_REPOSITORY');

/** 罚款记录检索条件 */
export interface PenaltyFilter {
  /** 按被罚打手过滤 */
  boosterUserId?: string;
}

/** 打手罚款仓储接口（领域层只依赖抽象，实现在基础设施层） */
export interface BoosterPenaltyRepository {
  /** 分页查询罚款记录（租户内），按创建时间倒序 */
  paginate(
    skip: number,
    take: number,
    filter: PenaltyFilter,
  ): Promise<[BoosterPenaltyEntity[], number]>;
  create(data: Partial<BoosterPenaltyEntity>): BoosterPenaltyEntity;
  save(entity: BoosterPenaltyEntity): Promise<BoosterPenaltyEntity>;
}
