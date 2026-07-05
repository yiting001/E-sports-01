import { Controller, Delete, Param } from '@nestjs/common';
import { PERMS } from '@app/contracts';
import { RemoveActivityUseCase } from '../../application/use-cases/remove-activity.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/**
 * 路由：删除活动（DELETE /activity/admin/:id）。
 * 需 activity:remove 权限。
 */
@Controller('activity')
export class ActivityAdminRemoveController {
  constructor(private readonly useCase: RemoveActivityUseCase) {}

  @Delete('admin/:id')
  @Permissions(PERMS.activity.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
