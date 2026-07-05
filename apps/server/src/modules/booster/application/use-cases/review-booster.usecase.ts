import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BOOSTER_ROLE_CODE,
  BoosterStatus,
  BoosterView,
  ReviewBoosterPayload,
} from '@app/contracts';
import { RoleGranter } from '../../../rbac/application/role-granter.service';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { toBoosterView } from '../booster.mapper';

/**
 * 用例：审核打手入驻申请（通过 / 驳回），仅对待审核记录有效。
 * 通过时经 RoleGranter 幂等地为申请人授予 booster 角色。
 */
@Injectable()
export class ReviewBoosterUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly roleGranter: RoleGranter,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    reviewerId: string,
    id: string,
    payload: ReviewBoosterPayload,
  ): Promise<BoosterView> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('入驻申请不存在');
    }
    if (record.status !== BoosterStatus.Pending) {
      throw new ConflictException('该入驻申请非待审核状态');
    }
    if (payload.approve) {
      record.status = BoosterStatus.Approved;
      record.rejectReason = '';
      await this.roleGranter.grant(record.userId, BOOSTER_ROLE_CODE);
    } else {
      const reason = payload.rejectReason?.trim();
      if (!reason) {
        throw new BadRequestException('驳回时必须填写理由');
      }
      record.status = BoosterStatus.Rejected;
      record.rejectReason = reason;
    }
    record.reviewedBy = reviewerId;
    record.reviewedAt = new Date();
    const saved = await this.repo.save(record);
    const profiles = await this.users.resolveProfiles([saved.userId]);
    return toBoosterView(saved, profiles.get(saved.userId));
  }
}
