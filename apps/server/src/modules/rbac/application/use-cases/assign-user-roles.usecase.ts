import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserView } from '@app/contracts';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';
import { toUserView } from '../user.mapper';

/** 用例：为用户重新分配角色，并失效其鉴权缓存 */
@Injectable()
export class AssignUserRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    private readonly resolver: PermissionResolver,
  ) {}

  async execute(userId: string, roleIds: string[]): Promise<UserView> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    user.roles = roleIds.length ? await this.roleRepo.findByIds(roleIds) : [];
    const saved = await this.userRepo.save(user);
    await this.resolver.invalidate(userId);
    return toUserView(saved);
  }
}
