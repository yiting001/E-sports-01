import { Body, Controller, Put } from '@nestjs/common';
import { BoosterServiceRegionOption, PERMS } from '@app/contracts';
import { SetBoosterRegionsUseCase } from '../../application/use-cases/set-booster-regions.usecase';
import { PlatformOnly } from '../../../rbac/interfaces/auth/platform-only.decorator';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { SetBoosterRegionsDto } from '../dto/set-booster-regions.dto';

/**
 * 路由：保存接单区服选项（PUT /booster/regions）。
 * 仅平台超级管理员且需 booster:region:set 权限；写入配置中心，立即对入驻表单生效。
 */
@Controller('booster')
@PlatformOnly()
export class BoosterRegionsSetController {
  constructor(private readonly useCase: SetBoosterRegionsUseCase) {}

  @Put('regions')
  @Permissions(PERMS.booster.regionSet)
  save(@Body() dto: SetBoosterRegionsDto): Promise<BoosterServiceRegionOption[]> {
    return this.useCase.execute(dto.options);
  }
}
