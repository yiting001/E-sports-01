import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  BoosterStatus,
  BoosterView,
  SubmitBoosterPayload,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { toBoosterView } from '../booster.mapper';

/**
 * 用例：提交/重提打手入驻申请。
 * 已通过则拒绝重复提交，审核中则拒绝覆盖；未提交或被驳回时可（重新）提交回到待审核。
 */
@Injectable()
export class SubmitBoosterUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    userId: string,
    payload: SubmitBoosterPayload,
  ): Promise<BoosterView> {
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
    const profiles = await this.users.resolveProfiles([userId]);
    return toBoosterView(saved, profiles.get(userId));
  }
}
