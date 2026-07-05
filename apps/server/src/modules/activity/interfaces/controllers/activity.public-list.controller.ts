import { Controller, Get } from '@nestjs/common';
import { ActivityPublicView } from '@app/contracts';
import { ListPublicActivitiesUseCase } from '../../application/use-cases/list-public-activities.usecase';

/** 路由：C 端进行中的活动列表（GET /activity/public）；仅登录态，所有角色可用 */
@Controller('activity')
export class ActivityPublicListController {
  constructor(private readonly useCase: ListPublicActivitiesUseCase) {}

  @Get('public')
  list(): Promise<ActivityPublicView[]> {
    return this.useCase.execute();
  }
}
