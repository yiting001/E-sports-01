import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';
import { isPlatformSuperRole } from '../role.mapper';

/**
 * 用例：软删除角色。只标记 deletedAt，用户绑定与权限关联保留以便恢复；
 * 被删角色在鉴权、用户角色加载中自动失效。平台超管角色不可删除。
 */
@Injectable()
export class RemoveRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: Pick<RoleRepository, 'findById' | 'remove'>,
    @Inject(PermissionResolver)
    private readonly resolver: Pick<PermissionResolver, 'invalidateAll'>,
  ) {}

  async execute(id: string): Promise<void> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (isPlatformSuperRole(role)) {
      throw new ConflictException('平台超级管理员角色不能删除');
    }
    await this.roleRepo.remove(id);
    await this.resolver.invalidateAll();
  }
}
