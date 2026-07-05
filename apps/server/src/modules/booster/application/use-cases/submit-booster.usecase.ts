import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  BoosterStatus,
  BoosterView,
  SubmitBoosterPayload,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { RealnameChecker } from '../../../realname/application/realname-checker.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';

/**
 * 用例：提交/重提打手入驻申请。
 * 已通过则拒绝重复提交，审核中则拒绝覆盖；未提交或被驳回时可（重新）提交回到待审核。
 * 配置要求实名前置时，未通过实名认证的用户禁止提交。
 */
@Injectable()
export class SubmitBoosterUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
    private readonly realname: RealnameChecker,
  ) {}

  async execute(
    userId: string,
    payload: SubmitBoosterPayload,
  ): Promise<BoosterView> {
    if (await this.policy.isRealnameRequired()) {
      const approved = await this.realname.isApproved(userId);
      if (!approved) {
        throw new ForbiddenException('请先完成实名认证后再提交入驻申请');
      }
    }
    const existing = await this.repo.findByUserId(userId);
    if (existing?.status === BoosterStatus.Approved) {
      throw new ConflictException('已通过入驻审核，无需重复提交');
    }
    if (existing?.status === BoosterStatus.Pending) {
      throw new ConflictException('入驻申请审核中，请勿重复提交');
    }
    const entity = existing ?? this.repo.create({ userId });
    entity.gameNickname = payload.gameNickname.trim();
    entity.gameName = payload.gameName.trim();
    entity.rank = payload.rank.trim();
    entity.intro = payload.intro.trim();
    entity.status = BoosterStatus.Pending;
    entity.rejectReason = '';
    entity.reviewedBy = '';
    entity.reviewedAt = null;
    const saved = await this.repo.save(entity);
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(userId));
  }
}
