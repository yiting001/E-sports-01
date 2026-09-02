import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, RoleListQuery, RoleView } from '@app/contracts';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import { toRoleView } from '../role.mapper';

/** 用例：分页查询角色列表，支持名称/编码搜索、编码精确筛选与内置/自定义分类 */
@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    filter: RoleListQuery = {},
  ): Promise<PaginatedResult<RoleView>> {
    const [rows, total] = await this.roleRepo.paginate(skip, pageSize, filter);
    return { list: rows.map(toRoleView), total, page, pageSize };
  }
}
