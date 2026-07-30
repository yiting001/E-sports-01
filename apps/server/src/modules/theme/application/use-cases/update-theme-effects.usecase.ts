import { Inject, Injectable } from '@nestjs/common';
import {
  sanitizeThemeEffects,
  ThemeEffect,
  ThemeEffectsView,
} from '@app/contracts';
import {
  THEME_SETTING_REPOSITORY,
  ThemeSettingRepository,
} from '../../domain/theme-setting-repository.interface';
import { toThemeEffectsView } from '../theme.mapper';

/** 用例：管理端整量覆盖当前租户的主题特效配置（每租户至多一条记录） */
@Injectable()
export class UpdateThemeEffectsUseCase {
  constructor(
    @Inject(THEME_SETTING_REPOSITORY)
    private readonly repo: ThemeSettingRepository,
  ) {}

  async execute(effects: ThemeEffect[]): Promise<ThemeEffectsView> {
    const sanitized = sanitizeThemeEffects(effects);
    const existing = await this.repo.findCurrent();
    const entity = existing ?? this.repo.create({});
    entity.effects = JSON.stringify(sanitized);
    return toThemeEffectsView(await this.repo.save(entity));
  }
}
