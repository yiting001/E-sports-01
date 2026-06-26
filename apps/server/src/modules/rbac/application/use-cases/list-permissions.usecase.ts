import { Inject, Injectable } from '@nestjs/common';
import { PermissionNode } from '@app/contracts';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission-repository.interface';
import { buildPermissionTree } from '../permission.mapper';

/** 用例：查询权限树（菜单/按钮/接口统一树） */
@Injectable()
export class ListPermissionsUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY) private readonly permRepo: PermissionRepository,
  ) {}

  async execute(): Promise<PermissionNode[]> {
    const permissions = await this.permRepo.findAll();
    return buildPermissionTree(permissions);
  }
}
