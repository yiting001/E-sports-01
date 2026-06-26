import { Body, Controller, Post } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { CreateRoleDto } from '../dto/create-role.dto';

/** 路由：新建角色 */
@Controller('rbac/roles')
export class RoleCreateController {
  constructor(private readonly useCase: CreateRoleUseCase) {}

  @Post()
  @Permissions(PERMS.role.create)
  create(@Body() dto: CreateRoleDto): Promise<RoleView> {
    return this.useCase.execute(dto);
  }
}
