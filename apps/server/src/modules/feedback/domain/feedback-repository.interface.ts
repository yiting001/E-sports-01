import { FeedbackStatus, FeedbackType } from '@app/contracts';
import { FeedbackEntity } from './feedback.entity';

export const FEEDBACK_REPOSITORY = Symbol('FEEDBACK_REPOSITORY');

/** 反馈仓储接口（领域层只依赖抽象，实现在基础设施层） */
export interface FeedbackRepository {
  /** 按主键取反馈记录（按租户上下文过滤） */
  findById(id: string): Promise<FeedbackEntity | null>;
  /** 管理端分页列表，可按状态/类型过滤，按提交时间倒序 */
  paginate(
    skip: number,
    take: number,
    status?: FeedbackStatus,
    type?: FeedbackType,
  ): Promise<[FeedbackEntity[], number]>;
  /** 用户本人的反馈分页列表，按提交时间倒序 */
  paginateByUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[FeedbackEntity[], number]>;
  create(data: Partial<FeedbackEntity>): FeedbackEntity;
  save(entity: FeedbackEntity): Promise<FeedbackEntity>;
}
