import type { ActivityEntity } from './activity.entity';

/** 活动仓储注入令牌 */
export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

/** 活动仓储端口（领域层只依赖此抽象） */
export interface ActivityRepository {
  findById(id: string): Promise<ActivityEntity | null>;
  /** 管理端分页（排序权重升序 + 创建时间倒序） */
  paginate(skip: number, take: number): Promise<[ActivityEntity[], number]>;
  /** C 端启用且进行中的活动（排序权重升序 + 创建时间倒序） */
  findOngoing(now: Date): Promise<ActivityEntity[]>;
  create(data: Partial<ActivityEntity>): ActivityEntity;
  save(entity: ActivityEntity): Promise<ActivityEntity>;
  remove(entity: ActivityEntity): Promise<void>;
}
