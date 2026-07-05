import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BoosterView, UpdateBoosterPayload } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';

/** 用例：管理端编辑打手资料（仅更新传入的字段，不改变审核状态） */
@Injectable()
export class UpdateBoosterUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
  ) {}

  async execute(id: string, payload: UpdateBoosterPayload): Promise<BoosterView> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('入驻申请不存在');
    }
    if (payload.gameNickname !== undefined) {
      record.gameNickname = payload.gameNickname.trim();
    }
    if (payload.gameName !== undefined) {
      record.gameName = payload.gameName.trim();
    }
    if (payload.rank !== undefined) {
      record.rank = payload.rank.trim();
    }
    if (payload.intro !== undefined) {
      record.intro = payload.intro.trim();
    }
    const saved = await this.repo.save(record);
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([saved.userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(saved.userId));
  }
}
