import { Inject, Injectable } from '@nestjs/common';
import { PermissionNode } from '@app/contracts';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission-repository.interface';
import { isPlatformOnlyPermission } from '../../domain/rbac.constants';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { buildPermissionTree } from '../permission.mapper';

/** 查询当前操作者可授予给角色的权限树。 */
@Injectable()
export class ListGrantablePermissionsUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: Pick<PermissionRepository, 'findAll'>,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(): Promise<PermissionNode[]> {
    const permissions = await this.permissions.findAll();
    const grantable = this.tenant.isSuper
      ? permissions
      : permissions.filter((permission) => !isPlatformOnlyPermission(permission.code));
    return buildPermissionTree(grantable);
  }
}
