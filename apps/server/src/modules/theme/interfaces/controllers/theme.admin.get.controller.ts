import { Controller, Get } from '@nestjs/common';
import { PERMS, ThemeEffectsView } from '@app/contracts';
import { GetThemeEffectsUseCase } from '../../application/use-cases/get-theme-effects.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：管理端读取当前租户主题特效配置（GET /theme/admin/effects） */
@Controller('theme/admin/effects')
export class ThemeAdminGetController {
  constructor(private readonly useCase: GetThemeEffectsUseCase) {}

  @Get()
  @Permissions(PERMS.theme.list)
  get(): Promise<ThemeEffectsView> {
    return this.useCase.execute();
  }
}
