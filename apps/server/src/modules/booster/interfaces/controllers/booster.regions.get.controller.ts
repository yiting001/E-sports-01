import { Controller, Get } from '@nestjs/common';
import { BoosterServiceRegionOption } from '@app/contracts';
import { GetBoosterRegionsUseCase } from '../../application/use-cases/get-booster-regions.usecase';

/**
 * 路由：查询接单区服选项（GET /booster/regions）。
 * 仅登录态：C 端入驻表单渲染选项，管理端编辑时回显。
 */
@Controller('booster')
export class BoosterRegionsGetController {
  constructor(private readonly useCase: GetBoosterRegionsUseCase) {}

  @Get('regions')
  regions(): Promise<BoosterServiceRegionOption[]> {
    return this.useCase.execute();
  }
}
