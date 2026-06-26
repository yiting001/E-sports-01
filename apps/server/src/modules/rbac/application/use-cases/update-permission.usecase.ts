import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission-repository.interface';
import { Permission } from '../../domain/permission.entity';

/** 更新权限入参（按需更新展示相关字段） */
export interface UpdatePermissionInput {
  name?: string;
  path?: string | null;
  component?: string | null;
  apiMethod?: string | null;
  apiPath?: string | null;
  icon?: string | null;
  sort?: number;
  parentId?: string | null;
}

/** 用例：更新权限节点 */
@Injectable()
export class UpdatePermissionUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY) private readonly permRepo: PermissionRepository,
  ) {}

  async execute(id: string, input: UpdatePermissionInput): Promise<Permission> {
    const permission = await this.permRepo.findById(id);
    if (!permission) {
      throw new NotFoundException('权限不存在');
    }
    Object.assign(permission, input);
    return this.permRepo.save(permission);
  }
}
