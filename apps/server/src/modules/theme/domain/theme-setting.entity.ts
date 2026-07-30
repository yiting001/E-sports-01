import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 主题特效配置聚合根。
 * 每个租户至多一条记录，保存 C 端启用的 Canvas UI 背景特效列表（可多选同时启用）。
 * effects 以 JSON 数组文本存储，读取时经 sanitizeThemeEffects 过滤非法值。
 */
@Entity('theme_effect_setting')
export class ThemeSettingEntity extends TenantScopedEntity {
  /** 启用的特效列表（JSON 数组文本，如 ["clouds","laser"]） */
  @Column({ type: 'text', default: '[]' })
  effects!: string;
}
