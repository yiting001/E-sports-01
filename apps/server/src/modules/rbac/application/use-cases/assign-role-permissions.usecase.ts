import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission-repository.interface';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';
import { toRoleView } from '../role.mapper';

/** 用例：为角色重新分配权限，并清空所有鉴权缓存 */
@Injectable()
export class AssignRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permRepo: PermissionRepository,
    private readonly resolver: PermissionResolver,
  ) {}

  async execute(roleId: string, permissionIds: string[]): Promise<RoleView> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    role.permissions = permissionIds.length
      ? await this.permRepo.findByIds(permissionIds)
      : [];
    const saved = await this.roleRepo.save(role);
    await this.resolver.invalidateAll();
    return toRoleView(saved);
  }
}
