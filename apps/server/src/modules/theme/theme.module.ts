import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';

import { ThemeSettingEntity } from './domain/theme-setting.entity';
import { THEME_SETTING_REPOSITORY } from './domain/theme-setting-repository.interface';

import { TypeormThemeSettingRepository } from './infrastructure/theme-setting.repository';

import { GetThemeEffectsUseCase } from './application/use-cases/get-theme-effects.usecase';
import { UpdateThemeEffectsUseCase } from './application/use-cases/update-theme-effects.usecase';
import { GetPublicThemeEffectsUseCase } from './application/use-cases/get-public-theme-effects.usecase';

import { ThemePublicController } from './interfaces/controllers/theme.public.controller';
import { ThemeAdminGetController } from './interfaces/controllers/theme.admin.get.controller';
import { ThemeAdminUpdateController } from './interfaces/controllers/theme.admin.update.controller';

/**
 * 主题特效模块。
 * DDD 四层：管理端按租户维护 C 端启用的 Canvas UI 背景特效（可多选同时启用）；
 * C 端经免登录公开接口按租户编码读取后渲染对应特效。
 */
@Module({
  imports: [RbacModule, TypeOrmModule.forFeature([ThemeSettingEntity])],
  controllers: [
    ThemePublicController,
    ThemeAdminGetController,
    ThemeAdminUpdateController,
  ],
  providers: [
    { provide: THEME_SETTING_REPOSITORY, useClass: TypeormThemeSettingRepository },
    GetThemeEffectsUseCase,
    UpdateThemeEffectsUseCase,
    GetPublicThemeEffectsUseCase,
  ],
})
export class ThemeModule {}
