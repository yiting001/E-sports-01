import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserView } from '@app/contracts';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role-repository.interface';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';
import { toUserView } from '../user.mapper';

/** 用例：为用户重新分配角色，并失效其鉴权缓存 */
@Injectable()
export class AssignUserRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: Pick<UserRepository, 'findById' | 'save'>,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: Pick<RoleRepository, 'findByIds'>,
    @Inject(PermissionResolver)
    private readonly resolver: Pick<PermissionResolver, 'invalidate'>,
  ) {}

  async execute(userId: string, roleIds: string[]): Promise<UserView> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const requestedRoleIds = [...new Set(roleIds)];
    const roles = requestedRoleIds.length ? await this.roleRepo.findByIds(requestedRoleIds) : [];
    if (roles.length !== requestedRoleIds.length) {
      throw new NotFoundException('部分角色不存在');
    }
    if (roles.some((role) => role.tenantId !== user.tenantId)) {
      throw new ForbiddenException('不能为用户绑定其他租户的角色');
    }
    user.roles = roles;
    const saved = await this.userRepo.save(user);
    await this.resolver.invalidate(userId);
    return toUserView(saved);
  }
}
