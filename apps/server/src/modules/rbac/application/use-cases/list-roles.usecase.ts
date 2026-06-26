import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, RoleView } from '@app/contracts';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import { toRoleView } from '../role.mapper';

/** 用例：分页查询角色列表 */
@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<RoleView>> {
    const [rows, total] = await this.roleRepo.paginate(skip, pageSize, keyword);
    return { list: rows.map(toRoleView), total, page, pageSize };
  }
}
