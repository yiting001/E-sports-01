import { Controller, Get } from '@nestjs/common';
import { PermissionNode, PERMS } from '@app/contracts';
import { ListGrantablePermissionsUseCase } from '../../application/use-cases/list-grantable-permissions.usecase';
import { Permissions } from '../auth/permissions.decorator';
import { PlatformOnly } from '../auth/platform-only.decorator';

/** 路由：查询可授予给角色的权限树（仅平台超管）。 */
@Controller('rbac/roles')
@PlatformOnly()
export class RoleGrantablePermissionsController {
  constructor(private readonly useCase: ListGrantablePermissionsUseCase) {}

  @Get('grantable-permissions')
  @Permissions(PERMS.role.assignPermissions)
  list(): Promise<PermissionNode[]> {
    return this.useCase.execute();
  }
}
