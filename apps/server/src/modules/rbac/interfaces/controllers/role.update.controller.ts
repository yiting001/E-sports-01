import { Body, Controller, Param, Patch } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import { UpdateRoleUseCase } from '../../application/use-cases/update-role.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { UpdateRoleDto } from '../dto/update-role.dto';

/** 路由：更新角色信息 */
@Controller('rbac/roles')
export class RoleUpdateController {
  constructor(private readonly useCase: UpdateRoleUseCase) {}

  @Patch(':id')
  @Permissions(PERMS.role.update)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleView> {
    return this.useCase.execute(id, dto);
  }
}
