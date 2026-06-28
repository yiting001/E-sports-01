import { RealnameStatus } from '@app/contracts';
import { RealnameAuthEntity } from './realname-auth.entity';

export const REALNAME_REPOSITORY = Symbol('REALNAME_REPOSITORY');

/** 实名认证仓储接口（领域层只依赖抽象，实现在基础设施层） */
export interface RealnameRepository {
  /** 按用户取实名记录（按租户上下文过滤） */
  findByUserId(userId: string): Promise<RealnameAuthEntity | null>;
  /** 按主键取实名记录 */
  findById(id: string): Promise<RealnameAuthEntity | null>;
  /** 分页审核列表，可按状态过滤，按提交时间倒序 */
  paginate(
    skip: number,
    take: number,
    status?: RealnameStatus,
  ): Promise<[RealnameAuthEntity[], number]>;
  create(data: Partial<RealnameAuthEntity>): RealnameAuthEntity;
  save(entity: RealnameAuthEntity): Promise<RealnameAuthEntity>;
}
