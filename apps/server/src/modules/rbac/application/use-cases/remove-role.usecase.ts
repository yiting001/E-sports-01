import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';

/** 用例：删除角色，并清空鉴权缓存（持有该角色的用户权限随之变化） */
@Injectable()
export class RemoveRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    private readonly resolver: PermissionResolver,
  ) {}

  async execute(id: string): Promise<void> {
    await this.roleRepo.remove(id);
    await this.resolver.invalidateAll();
  }
}
