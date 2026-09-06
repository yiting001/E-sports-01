import type {
  NoticePopupView,
  NoticePublicView,
  NoticeView,
} from '@app/contracts';
import type { NoticeEntity } from '../domain/notice.entity';

/** 实体 → 管理端视图 */
export function toNoticeView(entity: NoticeEntity): NoticeView {
  return {
    id: entity.id,
    title: entity.title,
    content: entity.content,
    enabled: entity.enabled,
    popup: entity.popup,
    popupFlame: entity.popupFlame,
    sort: entity.sort,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** 实体 → C 端公开视图（仅暴露展示所需字段） */
export function toNoticePublicView(entity: NoticeEntity): NoticePublicView {
  return {
    id: entity.id,
    title: entity.title,
    content: entity.content,
    createdAt: entity.createdAt.toISOString(),
  };
}

/** 实体 → C 端弹窗视图（附带更新时间作为弹窗版本号） */
export function toNoticePopupView(entity: NoticeEntity): NoticePopupView {
  return {
    ...toNoticePublicView(entity),
    updatedAt: entity.updatedAt.toISOString(),
    popupFlame: entity.popupFlame,
  };
}
