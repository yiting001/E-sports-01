import { Controller, Get, Param } from '@nestjs/common';
import { ActivityPublicView } from '@app/contracts';
import { GetPublicActivityUseCase } from '../../application/use-cases/get-public-activity.usecase';

/** 路由：C 端查看活动详情（GET /activity/public/:id）；仅登录态，所有角色可用 */
@Controller('activity')
export class ActivityPublicDetailController {
  constructor(private readonly useCase: GetPublicActivityUseCase) {}

  @Get('public/:id')
  detail(@Param('id') id: string): Promise<ActivityPublicView> {
    return this.useCase.execute(id);
  }
}
