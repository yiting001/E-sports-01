import { Body, Controller, Put } from '@nestjs/common';
import { PERMS, PortalBannerView } from '@app/contracts';
import { UpdatePortalBannerUseCase } from '../../application/use-cases/update-portal-banner.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpdateBannerDto } from '../dto/update-banner.dto';

/**
 * 路由：更新首页运营横幅图片（PUT /notice/banner）。
 * 需 notice:banner 权限；传空串即撤下横幅（C 端回退默认样式）。
 */
@Controller('notice/banner')
export class BannerUpdateController {
  constructor(private readonly useCase: UpdatePortalBannerUseCase) {}

  @Put()
  @Permissions(PERMS.notice.banner)
  update(@Body() dto: UpdateBannerDto): Promise<PortalBannerView> {
    return this.useCase.execute(dto);
  }
}
