import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { RemovePermissionUseCase } from '../../application/use-cases/remove-permission.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { PlatformOnly } from '../auth/platform-only.decorator';

/** 路由：删除权限节点 */
@Controller('rbac/permissions')
@PlatformOnly()
export class PermissionRemoveController {
  constructor(private readonly useCase: RemovePermissionUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(PERMS.permission.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
