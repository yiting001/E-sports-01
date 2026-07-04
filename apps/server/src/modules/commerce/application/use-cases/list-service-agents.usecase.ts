import { Injectable } from '@nestjs/common';
import { PaginatedResult, ServiceAgentOption } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';

/**
 * 用例：分页查询可关联为「负责客服」的候选用户（管理端商品表单选择器用）。
 * 复用用户目录的分页查询，可按用户名/昵称关键字过滤。
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
    const [list, total] = await this.users.paginateProfiles(
      skip,
      pageSize,
      keyword,
    );
    return { list, total, page, pageSize };
  }
}
