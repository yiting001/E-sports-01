import { Body, Controller, Param, Post } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import { AssignRolePermissionsUseCase } from '../../application/use-cases/assign-role-permissions.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';

/** 路由：为角色分配权限 */
@Controller('rbac/roles')
export class RoleAssignPermissionsController {
  constructor(private readonly useCase: AssignRolePermissionsUseCase) {}

  @Post(':id/permissions')
  @Permissions(PERMS.role.assignPermissions)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ): Promise<RoleView> {
    return this.useCase.execute(id, dto.permissionIds);
  }
}
