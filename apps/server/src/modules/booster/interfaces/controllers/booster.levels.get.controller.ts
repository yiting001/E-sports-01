import { Controller, Get } from '@nestjs/common';
import { BoosterLevelTier } from '@app/contracts';
import { GetBoosterLevelsUseCase } from '../../application/use-cases/get-booster-levels.usecase';

/**
 * 路由：查询打手等级档位（GET /booster/levels）。
 * 仅登录态：C 端展示晋升规则与提成费率，管理端编辑时回显。
 */
@Controller('booster')
export class BoosterLevelsGetController {
  constructor(private readonly useCase: GetBoosterLevelsUseCase) {}

  @Get('levels')
  levels(): Promise<BoosterLevelTier[]> {
    return this.useCase.execute();
  }
}
