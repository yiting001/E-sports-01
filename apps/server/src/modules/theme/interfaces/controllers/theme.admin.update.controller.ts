import { Body, Controller, Put } from '@nestjs/common';
import { PERMS, ThemeEffectsView } from '@app/contracts';
import { UpdateThemeEffectsUseCase } from '../../application/use-cases/update-theme-effects.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpdateThemeEffectsDto } from '../dto/update-theme-effects.dto';

/** 路由：管理端整量覆盖当前租户主题特效配置（PUT /theme/admin/effects），空数组即全部关闭 */
@Controller('theme/admin/effects')
export class ThemeAdminUpdateController {
  constructor(private readonly useCase: UpdateThemeEffectsUseCase) {}

  @Put()
  @Permissions(PERMS.theme.save)
  update(@Body() dto: UpdateThemeEffectsDto): Promise<ThemeEffectsView> {
    return this.useCase.execute(dto.effects);
  }
}
