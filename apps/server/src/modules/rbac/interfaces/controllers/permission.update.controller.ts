import { Body, Controller, Param, Patch } from '@nestjs/common';
import { PermissionNode } from '@app/contracts';
import { UpdatePermissionUseCase } from '../../application/use-cases/update-permission.usecase';
import { buildPermissionTree } from '../../application/permission.mapper';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { UpdatePermissionDto } from '../dto/update-permission.dto';

/** 路由：更新权限节点 */
@Controller('rbac/permissions')
export class PermissionUpdateController {
  constructor(private readonly useCase: UpdatePermissionUseCase) {}

  @Patch(':id')
  @Permissions(PERMS.permission.update)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionNode> {
    const updated = await this.useCase.execute(id, dto);
    return buildPermissionTree([updated])[0];
  }
}
