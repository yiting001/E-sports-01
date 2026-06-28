import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  RealnameStatus,
  RealnameView,
  SubmitRealnamePayload,
  maskIdCard,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  REALNAME_REPOSITORY,
  RealnameRepository,
} from '../../domain/realname-repository.interface';
import {
  ID_CARD_CIPHER,
  IdCardCipherPort,
} from '../../domain/id-card-cipher.interface';
import { toRealnameView } from '../realname.mapper';

/**
 * 用例：提交/重提实名认证。
 * 已通过则拒绝重复提交，审核中则拒绝覆盖；未提交或被驳回时可（重新）提交回到待审核。
 */
@Injectable()
export class SubmitRealnameUseCase {
  constructor(
    @Inject(REALNAME_REPOSITORY)
    private readonly repo: RealnameRepository,
    @Inject(ID_CARD_CIPHER)
    private readonly cipher: IdCardCipherPort,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    userId: string,
    payload: SubmitRealnamePayload,
  ): Promise<RealnameView> {
    const existing = await this.repo.findByUserId(userId);
    if (existing?.status === RealnameStatus.Approved) {
      throw new ConflictException('已通过实名认证，无需重复提交');
    }
    if (existing?.status === RealnameStatus.Pending) {
      throw new ConflictException('实名认证审核中，请勿重复提交');
    }
    const entity = existing ?? this.repo.create({ userId });
    entity.realName = payload.realName.trim();
    entity.idCardCipher = await this.cipher.encrypt(payload.idCardNo.trim());
    entity.idCardMasked = maskIdCard(payload.idCardNo);
    entity.frontImage = payload.frontImage;
    entity.backImage = payload.backImage;
    entity.status = RealnameStatus.Pending;
    entity.rejectReason = '';
    entity.reviewedBy = '';
    entity.reviewedAt = null;
    const saved = await this.repo.save(entity);
    const profiles = await this.users.resolveProfiles([userId]);
    return toRealnameView(saved, profiles.get(userId));
  }
}
