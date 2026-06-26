import { Controller, Get } from '@nestjs/common';
import { PermissionNode } from '@app/contracts';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';

/** 路由：查询权限树 */
@Controller('rbac/permissions')
export class PermissionListController {
  constructor(private readonly useCase: ListPermissionsUseCase) {}

  @Get()
  @Permissions(PERMS.permission.list)
  list(): Promise<PermissionNode[]> {
    return this.useCase.execute();
  }
}
