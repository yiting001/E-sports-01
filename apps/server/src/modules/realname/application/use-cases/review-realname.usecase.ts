import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  RealnameStatus,
  RealnameView,
  ReviewRealnamePayload,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { JqfWalletService } from '../../../wallet/application/jqf-wallet.service';
import {
  REALNAME_REPOSITORY,
  RealnameRepository,
} from '../../domain/realname-repository.interface';
import {
  ID_CARD_CIPHER,
  IdCardCipherPort,
} from '../../domain/id-card-cipher.interface';
import { toRealnameView } from '../realname.mapper';

/** 用例：审核实名认证（通过 / 驳回），仅对待审核记录有效 */
@Injectable()
export class ReviewRealnameUseCase {
  private readonly logger = new Logger(ReviewRealnameUseCase.name);

  constructor(
    @Inject(REALNAME_REPOSITORY)
    private readonly repo: RealnameRepository,
    private readonly users: UserDirectory,
    @Inject(ID_CARD_CIPHER)
    private readonly cipher: IdCardCipherPort,
    private readonly jqfWallet: JqfWalletService,
  ) {}

  async execute(
    reviewerId: string,
    id: string,
    payload: ReviewRealnamePayload,
  ): Promise<RealnameView> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('实名记录不存在');
    }
    if (record.status !== RealnameStatus.Pending) {
      throw new ConflictException('该实名记录非待审核状态');
    }
    if (payload.approve) {
      record.status = RealnameStatus.Approved;
      record.rejectReason = '';
    } else {
      const reason = payload.rejectReason?.trim();
      if (!reason) {
        throw new BadRequestException('驳回时必须填写理由');
      }
      record.status = RealnameStatus.Rejected;
      record.rejectReason = reason;
    }
    record.reviewedBy = reviewerId;
    record.reviewedAt = new Date();
    const saved = await this.repo.save(record);
    if (saved.status === RealnameStatus.Approved) {
      await this.openJqfWallet(saved.userId, saved.realName, saved.idCardCipher);
    }
    const profiles = await this.users.resolveProfiles([saved.userId]);
    return toRealnameView(saved, profiles.get(saved.userId));
  }

  /** 审核通过后同步开通计全付钱包；开户失败只记录状态，不影响审核结果 */
  private async openJqfWallet(
    userId: string,
    realName: string,
    idCardCipher: string,
  ): Promise<void> {
    try {
      const [idCardNo, phone] = await Promise.all([
        this.cipher.decrypt(idCardCipher),
        this.users.resolvePhone(userId),
      ]);
      await this.jqfWallet.openForUser({ userId, realName, idCardNo, phone });
    } catch (error) {
      this.logger.warn(
        `实名审核后钱包开户未完成（userId=${userId}）：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
