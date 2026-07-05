import { Body, Controller, Put } from '@nestjs/common';
import { BoosterLevelTier, PERMS } from '@app/contracts';
import { SetBoosterLevelsUseCase } from '../../application/use-cases/set-booster-levels.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { SetBoosterLevelsDto } from '../dto/set-booster-levels.dto';

/**
 * 路由：保存打手等级档位（PUT /booster/levels）。
 * 需 booster:level:set 权限；档位写入配置中心，立即对定级与结算生效。
 */
@Controller('booster')
export class BoosterLevelsSetController {
  constructor(private readonly useCase: SetBoosterLevelsUseCase) {}

  @Put('levels')
  @Permissions(PERMS.booster.levelSet)
  save(@Body() dto: SetBoosterLevelsDto): Promise<BoosterLevelTier[]> {
    return this.useCase.execute(dto.tiers);
  }
}
