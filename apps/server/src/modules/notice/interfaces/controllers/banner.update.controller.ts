import { Body, Controller, Put } from '@nestjs/common';
import { PERMS, PortalBannerView } from '@app/contracts';
import { UpdatePortalBannerUseCase } from '../../application/use-cases/update-portal-banner.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpdateBannerDto } from '../dto/update-banner.dto';

/**
 * 路由：更新首页运营横幅配置（PUT /notice/banner）。
 * 需 notice:banner 权限；传空数组即撤下全部横幅。
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
