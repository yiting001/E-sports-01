import { Injectable } from '@nestjs/common';
import { CouponDistributorCandidate, PaginatedResult } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';

/**
 * 用例：分页查询可指派为分发人的候选用户（管理端选择器用）。
 * 任意注册用户（客服/打手等）均可指派，可按用户名/昵称关键字过滤。
 */
@Injectable()
export class ListDistributorCandidatesUseCase {
  constructor(private readonly users: UserDirectory) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<CouponDistributorCandidate>> {
    const [list, total] = await this.users.paginateProfiles(
      skip,
      pageSize,
      keyword,
    );
    return { list, total, page, pageSize };
  }
}
