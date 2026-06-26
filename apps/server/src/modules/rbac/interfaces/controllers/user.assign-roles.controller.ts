import { Body, Controller, Param, Post } from '@nestjs/common';
import { UserView } from '@app/contracts';
import { AssignUserRolesUseCase } from '../../application/use-cases/assign-user-roles.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { AssignRolesDto } from '../dto/assign-roles.dto';

/** 路由：为用户分配角色 */
@Controller('rbac/users')
export class UserAssignRolesController {
  constructor(private readonly useCase: AssignUserRolesUseCase) {}

  @Post(':id/roles')
  @Permissions(PERMS.user.assignRoles)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
  ): Promise<UserView> {
    return this.useCase.execute(id, dto.roleIds);
  }
}
