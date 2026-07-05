import { Controller, Get, Query } from '@nestjs/common';
import { ActivityView, PaginatedResult, PERMS } from '@app/contracts';
import { ListActivitiesUseCase } from '../../application/use-cases/list-activities.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/**
 * 路由：管理端分页查询活动列表（GET /activity/admin）。
 * 需 activity:list 权限。
 */
@Controller('activity')
export class ActivityAdminListController {
  constructor(private readonly useCase: ListActivitiesUseCase) {}

  @Get('admin')
  @Permissions(PERMS.activity.list)
  list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<ActivityView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip);
  }
}
