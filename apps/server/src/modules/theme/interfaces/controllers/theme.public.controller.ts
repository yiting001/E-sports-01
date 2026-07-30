import { Controller, Get, Query } from '@nestjs/common';
import { ThemeEffectsView } from '@app/contracts';
import { GetPublicThemeEffectsUseCase } from '../../application/use-cases/get-public-theme-effects.usecase';
import { ThemeEffectsQueryDto } from '../dto/theme-effects-query.dto';
import { Public } from '../../../rbac/interfaces/auth/public.decorator';

/** 路由：C 端读取本租户启用的主题特效（GET /theme/effects），免登录只读 */
@Controller('theme/effects')
export class ThemePublicController {
  constructor(private readonly useCase: GetPublicThemeEffectsUseCase) {}

  @Get()
  @Public()
  effects(@Query() query: ThemeEffectsQueryDto): Promise<ThemeEffectsView> {
    return this.useCase.execute(query.tenantCode);
  }
}
