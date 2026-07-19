import { Injectable } from '@nestjs/common';
import {
  PaginatedResult,
  ServiceAgentOption,
} from '@app/contracts';
import { BoosterCandidateService } from '../../../booster/application/booster-candidate.service';

/**
 * 用例：分页查询可被指派的平台打手候选（管理端指派打手选择器用）。
 * 仅返回同租户内审核通过、账号启用且已自主上线的打手，可按用户名/昵称过滤。
 */
@Injectable()
export class ListBoosterCandidatesUseCase {
  constructor(private readonly candidates: BoosterCandidateService) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<ServiceAgentOption>> {
    const [list, total] = await this.candidates.paginate(skip, pageSize, keyword);
    return { list, total, page, pageSize };
  }
}
