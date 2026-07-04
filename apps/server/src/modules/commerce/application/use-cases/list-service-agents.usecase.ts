import { Injectable } from '@nestjs/common';
import { PaginatedResult, ServiceAgentOption } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { SERVICE_ROLE } from '../../../rbac/domain/rbac.constants';

/**
 * 用例：分页查询可关联为「负责客服」的候选用户（管理端商品表单选择器用）。
 * 仅返回拥有「客服」角色的用户（非全部用户），可按用户名/昵称关键字过滤。
 */
@Injectable()
export class ListServiceAgentsUseCase {
  constructor(private readonly users: UserDirectory) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<ServiceAgentOption>> {
    const [list, total] = await this.users.paginateProfilesByRole(
      SERVICE_ROLE,
      skip,
      pageSize,
      keyword,
    );
    return { list, total, page, pageSize };
  }
}
