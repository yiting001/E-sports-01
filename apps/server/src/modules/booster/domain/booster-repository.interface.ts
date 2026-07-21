import { BoosterStatus } from '@app/contracts';
import { BoosterApplicationEntity } from './booster-application.entity';

export const BOOSTER_REPOSITORY = Symbol('BOOSTER_REPOSITORY');

/** 打手入驻申请仓储接口（领域层只依赖抽象，实现在基础设施层） */
export interface BoosterRepository {
  /** 按用户取申请记录（按租户上下文过滤） */
  findByUserId(userId: string): Promise<BoosterApplicationEntity | null>;
  /** 按主键取申请记录 */
  findById(id: string): Promise<BoosterApplicationEntity | null>;
  /** 分页管理列表，可按状态、名称或注册手机号过滤，按提交时间倒序 */
  paginate(
    skip: number,
    take: number,
    status?: BoosterStatus,
    keyword?: string,
  ): Promise<[BoosterApplicationEntity[], number]>;
  create(data: Partial<BoosterApplicationEntity>): BoosterApplicationEntity;
  /** 新记录插入；既有记录只更新非资金、非进度字段。 */
  save(entity: BoosterApplicationEntity): Promise<BoosterApplicationEntity>;
  /** 行锁内登记完成单数，返回递增前的完成单数。 */
  recordCompletedOrder(userId: string): Promise<number | null>;
}
