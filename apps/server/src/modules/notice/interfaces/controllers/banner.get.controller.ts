import { Controller, Get } from '@nestjs/common';
import { PortalBannerView } from '@app/contracts';
import { GetPortalBannerUseCase } from '../../application/use-cases/get-portal-banner.usecase';
import { Public } from '../../../rbac/interfaces/auth/public.decorator';

/** 路由：C 端读取首页运营横幅图片（GET /notice/banner），免登录只读 */
@Controller('notice/banner')
export class BannerGetController {
  constructor(private readonly useCase: GetPortalBannerUseCase) {}

  @Get()
  @Public()
  get(): Promise<PortalBannerView> {
    return this.useCase.execute();
  }
}
