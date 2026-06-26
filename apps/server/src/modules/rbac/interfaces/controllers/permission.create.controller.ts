import { Body, Controller, Post } from '@nestjs/common';
import { PermissionNode } from '@app/contracts';
import { CreatePermissionUseCase } from '../../application/use-cases/create-permission.usecase';
import { buildPermissionTree } from '../../application/permission.mapper';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { CreatePermissionDto } from '../dto/create-permission.dto';

/** 路由：新建权限（菜单/按钮/接口统一权限树节点） */
@Controller('rbac/permissions')
export class PermissionCreateController {
  constructor(private readonly useCase: CreatePermissionUseCase) {}

  @Post()
  @Permissions(PERMS.permission.create)
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionNode> {
    const created = await this.useCase.execute(dto);
    return buildPermissionTree([created])[0];
  }
}
