import { Inject, Injectable } from '@nestjs/common';
import type { ServiceAgentOption } from '@app/contracts';
import {
  BOOSTER_DIRECTORY_QUERY,
  BoosterDirectoryQuery,
} from '../domain/booster-directory.query';

/** 打手模块对外提供的候选查询，只返回审核与账号状态有效且已上线的打手。 */
@Injectable()
export class BoosterCandidateService {
  constructor(
    @Inject(BOOSTER_DIRECTORY_QUERY)
    private readonly directory: BoosterDirectoryQuery,
  ) {}

  paginate(
    skip: number,
    take: number,
    keyword?: string,
  ): Promise<[ServiceAgentOption[], number]> {
    return this.directory.paginateAvailableCandidates(skip, take, keyword);
  }
}
