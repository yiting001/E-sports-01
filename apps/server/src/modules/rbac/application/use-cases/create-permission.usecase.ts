import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PermissionType } from '@app/contracts';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission-repository.interface';
import { Permission } from '../../domain/permission.entity';

/** 创建权限入参 */
export interface CreatePermissionInput {
  parentId?: string | null;
  code: string;
  name: string;
  type: PermissionType;
  path?: string | null;
  component?: string | null;
  apiMethod?: string | null;
  apiPath?: string | null;
  icon?: string | null;
  sort?: number;
}

/** 用例：创建权限节点 */
@Injectable()
export class CreatePermissionUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY) private readonly permRepo: PermissionRepository,
  ) {}

  async execute(input: CreatePermissionInput): Promise<Permission> {
    if (await this.permRepo.existsByCode(input.code)) {
      throw new ConflictException('权限编码已存在');
    }
    const entity = this.permRepo.create({
      parentId: input.parentId ?? null,
      code: input.code,
      name: input.name,
      type: input.type,
      path: input.path ?? null,
      component: input.component ?? null,
      apiMethod: input.apiMethod ?? null,
      apiPath: input.apiPath ?? null,
      icon: input.icon ?? null,
      sort: input.sort ?? 0,
    });
    return this.permRepo.save(entity);
  }
}
