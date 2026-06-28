import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  RealnameStatus,
  RealnameView,
  ReviewRealnamePayload,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  REALNAME_REPOSITORY,
  RealnameRepository,
} from '../../domain/realname-repository.interface';
import { toRealnameView } from '../realname.mapper';

/** 用例：审核实名认证（通过 / 驳回），仅对待审核记录有效 */
@Injectable()
export class ReviewRealnameUseCase {
  constructor(
    @Inject(REALNAME_REPOSITORY)
    private readonly repo: RealnameRepository,
    private readonly users: UserDirectory,
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
    const profiles = await this.users.resolveProfiles([saved.userId]);
    return toRealnameView(saved, profiles.get(saved.userId));
  }
}
