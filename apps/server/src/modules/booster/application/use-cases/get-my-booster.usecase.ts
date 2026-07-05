import { Inject, Injectable } from '@nestjs/common';
import { BoosterMineView, BoosterStatus } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { RealnameChecker } from '../../../realname/application/realname-checker.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';

/**
 * 用例：获取当前用户打手入驻概览。
 * 返回申请记录（含等级与押金）以及实名前置要求 / 应缴押金等策略信息，
 * 供 C 端一次拉取即可渲染入驻页全部状态。
 */
@Injectable()
export class GetMyBoosterUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
    private readonly realname: RealnameChecker,
  ) {}

  async execute(userId: string): Promise<BoosterMineView> {
    const [record, requireRealname, realnameApproved, depositRequiredFen] =
      await Promise.all([
        this.repo.findByUserId(userId),
        this.policy.isRealnameRequired(),
        this.realname.isApproved(userId),
        this.policy.getDepositRequiredFen(),
      ]);
    if (!record) {
      return {
        status: BoosterStatus.None,
        record: null,
        requireRealname,
        realnameApproved,
        depositRequiredFen,
      };
    }
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([userId]),
      this.policy.getLevelTiers(),
    ]);
    return {
      status: record.status,
      record: toBoosterView(record, tiers, profiles.get(userId)),
      requireRealname,
      realnameApproved,
      depositRequiredFen,
    };
  }
}
