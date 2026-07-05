import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, PenaltyView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_PENALTY_REPOSITORY,
  BoosterPenaltyRepository,
} from '../../domain/penalty-repository.interface';
import { toPenaltyView } from '../penalty.mapper';

/** 用例：分页查询罚款记录（财务），可按被罚打手过滤 */
@Injectable()
export class ListPenaltiesUseCase {
  constructor(
    @Inject(BOOSTER_PENALTY_REPOSITORY)
    private readonly repo: BoosterPenaltyRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    boosterUserId?: string,
  ): Promise<PaginatedResult<PenaltyView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize, {
      boosterUserId,
    });
    const profiles = await this.users.resolveProfiles(
      rows.map((r) => r.boosterUserId),
    );
    const list = rows.map((r) =>
      toPenaltyView(r, profiles.get(r.boosterUserId)),
    );
    return { list, total, page, pageSize };
  }
}
