import { Inject, Injectable } from '@nestjs/common';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';

/** 用例：删除权限节点，并清空鉴权缓存 */
@Injectable()
export class RemovePermissionUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY) private readonly permRepo: PermissionRepository,
    private readonly resolver: PermissionResolver,
  ) {}

  async execute(id: string): Promise<void> {
    await this.permRepo.remove(id);
    await this.resolver.invalidateAll();
  }
}
