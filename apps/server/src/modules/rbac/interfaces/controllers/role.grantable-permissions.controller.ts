import { Controller, Get } from '@nestjs/common';
import { PermissionNode, PERMS } from '@app/contracts';
import { ListGrantablePermissionsUseCase } from '../../application/use-cases/list-grantable-permissions.usecase';
import { Permissions } from '../auth/permissions.decorator';

/** 路由：查询当前租户可授予给角色的权限树。 */
@Controller('rbac/roles')
export class RoleGrantablePermissionsController {
  constructor(private readonly useCase: ListGrantablePermissionsUseCase) {}

  @Get('grantable-permissions')
  @Permissions(PERMS.role.assignPermissions)
  list(): Promise<PermissionNode[]> {
    return this.useCase.execute();
  }
}
