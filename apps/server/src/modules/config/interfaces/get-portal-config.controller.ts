import { Controller, Get } from '@nestjs/common';
import { PortalConfigView } from '@app/contracts';
import { Public } from '../../rbac/interfaces/auth/public.decorator';
import { GetPortalConfigUseCase } from '../application/use-cases/get-portal-config.usecase';

/** 路由：读取 C 端门户开关配置（排行榜显隐等），登录前即可访问 */
@Controller('config')
export class GetPortalConfigController {
  constructor(private readonly useCase: GetPortalConfigUseCase) {}

  @Get('portal')
  @Public()
  portal(): Promise<PortalConfigView> {
    return this.useCase.execute();
  }
}
