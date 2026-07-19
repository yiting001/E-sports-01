import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { BoosterStatus, BoosterView, SubmitBoosterPayload } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { RealnameChecker } from '../../../realname/application/realname-checker.service';
import { BOOSTER_REPOSITORY, BoosterRepository } from '../../domain/booster-repository.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';
import { toLegacyGameName, toLegacyGameNickname } from '../booster-compatibility';

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

  async execute(userId: string, payload: SubmitBoosterPayload): Promise<BoosterView> {
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
    entity.applicantName = payload.applicantName.trim();
    entity.gender = payload.gender;
    entity.serviceRegions = [...payload.serviceRegions];
    entity.intro = payload.intro.trim();
    entity.contactType = payload.contactType;
    entity.contactValue = payload.contactValue.trim();
    entity.materialImage = payload.materialImage.trim();
    entity.invitationCode = payload.invitationCode.trim();
    // 保持旧列可回滚，新申请不再赋予“游戏昵称/段位”的业务含义。
    entity.legacyGameNickname = toLegacyGameNickname(entity.applicantName);
    entity.legacyGameName = toLegacyGameName(entity.serviceRegions);
    entity.legacyRank = '';
    entity.status = BoosterStatus.Pending;
    entity.rejectReason = '';
    entity.reviewedBy = '';
    entity.reviewedAt = null;
    entity.acceptingOrders = false;
    const saved = await this.repo.save(entity);
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(userId));
  }
}
