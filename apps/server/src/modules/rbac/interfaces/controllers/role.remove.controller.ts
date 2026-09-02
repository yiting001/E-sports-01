import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { RemoveRoleUseCase } from '../../application/use-cases/remove-role.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { PlatformOnly } from '../auth/platform-only.decorator';

/** 路由：删除角色 */
@Controller('rbac/roles')
@PlatformOnly()
export class RoleRemoveController {
  constructor(private readonly useCase: RemoveRoleUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(PERMS.role.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
