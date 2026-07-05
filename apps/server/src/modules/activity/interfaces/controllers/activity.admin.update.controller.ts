import { Body, Controller, Param, Put } from '@nestjs/common';
import { ActivityView, PERMS } from '@app/contracts';
import { SaveActivityUseCase } from '../../application/use-cases/save-activity.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpsertActivityDto } from '../dto/upsert-activity.dto';

/**
 * 路由：编辑活动（PUT /activity/admin/:id）。
 * 需 activity:save 权限。
 */
@Controller('activity')
export class ActivityAdminUpdateController {
  constructor(private readonly useCase: SaveActivityUseCase) {}

  @Put('admin/:id')
  @Permissions(PERMS.activity.save)
  update(
    @Param('id') id: string,
    @Body() dto: UpsertActivityDto,
  ): Promise<ActivityView> {
    return this.useCase.execute(dto, id);
  }
}
