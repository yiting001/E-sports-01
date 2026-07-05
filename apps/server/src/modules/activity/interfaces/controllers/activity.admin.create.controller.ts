import { Body, Controller, Post } from '@nestjs/common';
import { ActivityView, PERMS } from '@app/contracts';
import { SaveActivityUseCase } from '../../application/use-cases/save-activity.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpsertActivityDto } from '../dto/upsert-activity.dto';

/**
 * 路由：发布活动（POST /activity/admin）。
 * 需 activity:save 权限。
 */
@Controller('activity')
export class ActivityAdminCreateController {
  constructor(private readonly useCase: SaveActivityUseCase) {}

  @Post('admin')
  @Permissions(PERMS.activity.save)
  create(@Body() dto: UpsertActivityDto): Promise<ActivityView> {
    return this.useCase.execute(dto);
  }
}
