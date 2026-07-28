import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { isPlatformOnlyPermission } from '../../domain/rbac.constants';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';

/** 用例：为角色重新分配权限，并清空所有鉴权缓存 */
@Injectable()
export class AssignRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: Pick<RoleRepository, 'findById' | 'save'>,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permRepo: Pick<PermissionRepository, 'findByIds'>,
    @Inject(PermissionResolver)
    private readonly resolver: Pick<PermissionResolver, 'invalidateAll'>,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(roleId: string, permissionIds: string[]): Promise<RoleView> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    const requestedIds = [...new Set(permissionIds)];
    const permissions = requestedIds.length
      ? await this.permRepo.findByIds(requestedIds)
      : [];
    if (permissions.length !== requestedIds.length) {
      throw new NotFoundException('部分权限不存在');
    }
    if (
      !this.tenant.isSuper &&
      permissions.some((permission) => isPlatformOnlyPermission(permission.code))
    ) {
      throw new ForbiddenException('不能向租户角色授予平台权限');
    }
    role.permissions = permissions;
    const saved = await this.roleRepo.save(role);
    await this.resolver.invalidateAll();
    return toRoleView(saved);
  }
}
