import type { ActivityPublicView, ActivityView } from '@app/contracts';
import type { ActivityEntity } from '../domain/activity.entity';

/** 实体 → 管理端视图 */
export function toActivityView(entity: ActivityEntity): ActivityView {
  return {
    id: entity.id,
    title: entity.title,
    cover: entity.cover,
    content: entity.content,
    startAt: entity.startAt.toISOString(),
    endAt: entity.endAt.toISOString(),
    enabled: entity.enabled,
    sort: entity.sort,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** 实体 → C 端公开视图（仅暴露展示所需字段） */
export function toActivityPublicView(
  entity: ActivityEntity,
): ActivityPublicView {
  return {
    id: entity.id,
    title: entity.title,
    cover: entity.cover,
    content: entity.content,
    startAt: entity.startAt.toISOString(),
    endAt: entity.endAt.toISOString(),
  };
}
