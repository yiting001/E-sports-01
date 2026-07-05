import { Injectable } from '@nestjs/common';
import {
  BOOSTER_ROLE_CODE,
  PaginatedResult,
  ServiceAgentOption,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';

/**
 * 用例：分页查询可被指派的平台打手候选（管理端指派打手选择器用）。
 * 仅返回拥有「打手」角色的用户，可按用户名/昵称关键字过滤。
 */
@Injectable()
export class ListBoosterCandidatesUseCase {
  constructor(private readonly users: UserDirectory) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<ServiceAgentOption>> {
    const [list, total] = await this.users.paginateProfilesByRole(
      BOOSTER_ROLE_CODE,
      skip,
      pageSize,
      keyword,
    );
    return { list, total, page, pageSize };
  }
}
