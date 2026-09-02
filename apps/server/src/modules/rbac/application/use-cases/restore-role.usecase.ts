import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';
import { toRoleView } from '../role.mapper';

/** 用例：恢复软删除的角色；原有用户绑定与权限关联随之重新生效 */
@Injectable()
export class RestoreRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    private readonly resolver: PermissionResolver,
  ) {}

  async execute(id: string): Promise<RoleView> {
    const deleted = await this.roleRepo.findDeletedById(id);
    if (!deleted) {
      throw new NotFoundException('已删除角色不存在');
    }
    if (await this.roleRepo.findByCodeForTenant(deleted.code, deleted.tenantId)) {
      throw new ConflictException('同编码角色已存在，无法恢复');
    }
    await this.roleRepo.restore(id);
    await this.resolver.invalidateAll();
    const restored = await this.roleRepo.findById(id);
    if (!restored) {
      throw new NotFoundException('角色不存在');
    }
    return toRoleView(restored);
  }
}
