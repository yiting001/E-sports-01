import type { NoticeEntity } from './notice.entity';

/** 通知仓储注入令牌 */
export const NOTICE_REPOSITORY = Symbol('NOTICE_REPOSITORY');

/** 通知仓储端口（领域层只依赖此抽象） */
export interface NoticeRepository {
  findById(id: string): Promise<NoticeEntity | null>;
  /** 管理端分页（排序权重升序 + 创建时间倒序） */
  paginate(skip: number, take: number): Promise<[NoticeEntity[], number]>;
  /** C 端启用中的通知（排序权重升序 + 创建时间倒序） */
  findEnabled(): Promise<NoticeEntity[]>;
  /** 当前租户最新一条启用中的弹窗公告（排序权重升序 + 创建时间倒序） */
  findLatestPopup(): Promise<NoticeEntity | null>;
  create(data: Partial<NoticeEntity>): NoticeEntity;
  save(entity: NoticeEntity): Promise<NoticeEntity>;
  remove(entity: NoticeEntity): Promise<void>;
}
