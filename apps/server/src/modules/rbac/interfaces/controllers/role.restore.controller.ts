import { Controller, Param, Post } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import { RestoreRoleUseCase } from '../../application/use-cases/restore-role.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { PlatformOnly } from '../auth/platform-only.decorator';

/** 路由：恢复已软删除的角色（与删除共用权限码） */
@Controller('rbac/roles')
@PlatformOnly()
export class RoleRestoreController {
  constructor(private readonly useCase: RestoreRoleUseCase) {}

  @Post(':id/restore')
  @Permissions(PERMS.role.remove)
  restore(@Param('id') id: string): Promise<RoleView> {
    return this.useCase.execute(id);
  }
}
