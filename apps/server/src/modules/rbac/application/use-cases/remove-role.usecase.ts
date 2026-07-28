import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role-repository.interface';
import { RESERVED_ROLE_CODE_SET } from '../../domain/rbac.constants';
import { PermissionResolver } from '../permission-resolver.service';

/** 用例：删除角色，并清空鉴权缓存（持有该角色的用户权限随之变化） */
@Injectable()
export class RemoveRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    private readonly resolver: PermissionResolver,
  ) {}

  async execute(id: string): Promise<void> {
    const role = await this.roleRepo.findById(id);
    if (role && RESERVED_ROLE_CODE_SET.has(role.code)) {
      throw new ConflictException('内置角色不能删除');
    }
    await this.roleRepo.remove(id);
    await this.resolver.invalidateAll();
  }
}
