import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BoosterView, UpdateBoosterPayload } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { BOOSTER_REPOSITORY, BoosterRepository } from '../../domain/booster-repository.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';
import { toLegacyGameName, toLegacyGameNickname } from '../booster-compatibility';

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
    if (payload.applicantName !== undefined) {
      record.applicantName = payload.applicantName.trim();
      record.legacyGameNickname = toLegacyGameNickname(record.applicantName);
    }
    if (payload.gender !== undefined) {
      record.gender = payload.gender;
    }
    if (payload.serviceRegions !== undefined) {
      record.serviceRegions = [...payload.serviceRegions];
      record.legacyGameName = toLegacyGameName(record.serviceRegions);
    }
    if (payload.intro !== undefined) {
      record.intro = payload.intro.trim();
    }
    if (payload.contactType !== undefined) {
      record.contactType = payload.contactType;
    }
    if (payload.contactValue !== undefined) {
      record.contactValue = payload.contactValue.trim();
    }
    if (payload.materialImage !== undefined) {
      record.materialImage = payload.materialImage.trim();
    }
    if (payload.invitationCode !== undefined) {
      record.invitationCode = payload.invitationCode.trim();
    }
    const saved = await this.repo.save(record);
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([saved.userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(saved.userId));
  }
}
