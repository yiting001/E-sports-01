import { Inject, Injectable } from '@nestjs/common';
import {
  BoosterStatus,
  BoosterView,
  PaginatedResult,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { toBoosterView } from '../booster.mapper';

/** 用例：分页查询打手入驻申请（管理端），可按状态过滤 */
@Injectable()
export class ListBoosterUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    status?: BoosterStatus,
  ): Promise<PaginatedResult<BoosterView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize, status);
    const profiles = await this.users.resolveProfiles(
      rows.map((r) => r.userId),
    );
    const list = rows.map((r) => toBoosterView(r, profiles.get(r.userId)));
    return { list, total, page, pageSize };
  }
}
