import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../domain/role-repository.interface';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../domain/user-repository.interface';

/**
 * 角色授予服务（对外部模块暴露的最小角色写口）。
 * 供业务模块在自身流程中按角色码为用户授予/回收内置角色
 * （如打手入驻审核通过授予 booster），避免各模块直接操作 RBAC 仓储。
 */
@Injectable()
export class RoleGranter {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  /** 幂等地为用户授予指定角色码（用户已拥有则跳过） */
  async grant(userId: string, roleCode: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if ((user.roles ?? []).some((r) => r.code === roleCode)) {
      return;
    }
    const role = await this.roles.findByCode(roleCode);
    if (!role) {
      throw new NotFoundException(`角色 ${roleCode} 不存在`);
    }
    user.roles = [...(user.roles ?? []), role];
    await this.users.save(user);
  }

  /** 幂等地回收用户的指定角色码（用户未拥有则跳过） */
  async revoke(userId: string, roleCode: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const owned = user.roles ?? [];
    if (!owned.some((r) => r.code === roleCode)) {
      return;
    }
    user.roles = owned.filter((r) => r.code !== roleCode);
    await this.users.save(user);
  }
}
