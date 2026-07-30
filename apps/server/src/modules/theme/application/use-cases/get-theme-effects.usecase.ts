import { Inject, Injectable } from '@nestjs/common';
import { ThemeEffectsView } from '@app/contracts';
import {
  THEME_SETTING_REPOSITORY,
  ThemeSettingRepository,
} from '../../domain/theme-setting-repository.interface';
import { toThemeEffectsView } from '../theme.mapper';

/** 用例：管理端读取当前租户的主题特效配置，未配置时返回空列表 */
@Injectable()
export class GetThemeEffectsUseCase {
  constructor(
    @Inject(THEME_SETTING_REPOSITORY)
    private readonly repo: ThemeSettingRepository,
  ) {}

  async execute(): Promise<ThemeEffectsView> {
    return toThemeEffectsView(await this.repo.findCurrent());
  }
}
