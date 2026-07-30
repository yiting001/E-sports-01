import type { ThemeSettingEntity } from './theme-setting.entity';

export const THEME_SETTING_REPOSITORY = Symbol('THEME_SETTING_REPOSITORY');

/** 主题特效配置仓储端口 */
export interface ThemeSettingRepository {
  /** 取当前租户上下文的配置（管理端） */
  findCurrent(): Promise<ThemeSettingEntity | null>;
  /** 按租户主键取配置（C 端公开接口显式解析租户后使用） */
  findByTenantId(tenantId: string): Promise<ThemeSettingEntity | null>;
  create(data: Partial<ThemeSettingEntity>): ThemeSettingEntity;
  save(entity: ThemeSettingEntity): Promise<ThemeSettingEntity>;
}
