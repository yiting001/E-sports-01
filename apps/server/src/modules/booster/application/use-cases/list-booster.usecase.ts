import { Inject, Injectable } from '@nestjs/common';
import { BoosterStatus, BoosterView, PaginatedResult } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { BOOSTER_REPOSITORY, BoosterRepository } from '../../domain/booster-repository.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';

/** 用例：分页查询打手入驻申请（管理端），可按状态、名称或注册手机号过滤 */
@Injectable()
export class ListBoosterUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    status?: BoosterStatus,
    keyword?: string,
  ): Promise<PaginatedResult<BoosterView>> {
    const normalizedKeyword = keyword?.trim() || undefined;
    const [rows, total] = await this.repo.paginate(skip, pageSize, status, normalizedKeyword);
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles(rows.map((r) => r.userId)),
      this.policy.getLevelTiers(),
    ]);
    const list = rows.map((r) => toBoosterView(r, tiers, profiles.get(r.userId)));
    return { list, total, page, pageSize };
  }
}
