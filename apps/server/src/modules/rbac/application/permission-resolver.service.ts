import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import { SUPER_ADMIN_ROLE } from '../domain/rbac.constants';
import { ROLE_REPOSITORY, RoleRepository } from '../domain/role-repository.interface';
import { USER_REPOSITORY, UserRepository } from '../domain/user-repository.interface';

/** 用户的鉴权上下文：角色码、扁平权限码、是否超管 */
export interface UserAuthContext {
  tenantId: string | null;
  enabled: boolean;
  roles: string[];
  permissions: string[];
  isSuper: boolean;
}

/**
 * 权限解析服务。
 * 聚合用户 → 角色 → 权限，得到实时鉴权上下文。
 * 鉴权结果不做跨请求缓存，确保停用用户和撤销角色立即生效且不会被并发旧值覆盖。
 */
@Injectable()
export class PermissionResolver {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: Pick<UserRepository, 'findById'>,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: Pick<RoleRepository, 'findByIds'>,
  ) {}

  async resolve(userId: string): Promise<UserAuthContext> {
    return this.compute(userId);
  }

  async invalidate(_userId: string): Promise<void> {
    return Promise.resolve();
  }

  /** 保留调用端口；实时解析模式无需显式失效。 */
  async invalidateAll(): Promise<void> {
    return Promise.resolve();
  }

  private async compute(userId: string): Promise<UserAuthContext> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return { tenantId: null, enabled: false, roles: [], permissions: [], isSuper: false };
    }
    const roleIds = (user.roles ?? []).map((r) => r.id);
    const roles = (await this.roleRepo.findByIds(roleIds)).filter(
      (role) => role.tenantId === user.tenantId,
    );
    const roleCodes = roles.map((r) => r.code);
    const permissions = new Set<string>();
    for (const role of roles) {
      for (const perm of role.permissions ?? []) {
        permissions.add(perm.code);
      }
    }
    return {
      tenantId: user.tenantId,
      enabled: user.status === 'enabled',
      roles: roleCodes,
      permissions: [...permissions],
      isSuper: user.tenantId === DEFAULT_TENANT_ID && roleCodes.includes(SUPER_ADMIN_ROLE),
    };
  }

}
