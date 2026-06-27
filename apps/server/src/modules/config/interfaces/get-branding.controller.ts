import { Controller, Get } from '@nestjs/common';
import { BrandingView } from '@app/contracts';
import { Public } from '../../rbac/interfaces/auth/public.decorator';
import { GetBrandingUseCase } from '../application/use-cases/get-branding.usecase';

/** 路由：读取平台品牌信息（软件名称 + 图标），登录前即可访问 */
@Controller('config')
export class GetBrandingController {
  constructor(private readonly useCase: GetBrandingUseCase) {}

  @Get('branding')
  @Public()
  branding(): Promise<BrandingView> {
    return this.useCase.execute();
  }
}
