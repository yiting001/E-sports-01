import {
  BoosterStatus,
  BoosterView,
  UpdateBoosterAvailabilityPayload,
} from '@app/contracts';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';

/** 用例：审核通过的打手自主切换是否上线接单。 */
@Injectable()
export class UpdateMyBoosterAvailabilityUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
  ) {}

  async execute(
    userId: string,
    payload: UpdateBoosterAvailabilityPayload,
  ): Promise<BoosterView> {
    const record = await this.repo.findByUserId(userId);
    if (!record) {
      throw new NotFoundException('打手入驻记录不存在');
    }
    if (record.status !== BoosterStatus.Approved) {
      throw new ForbiddenException('仅审核通过的打手可切换上线状态');
    }
    let current = record;
    if (record.acceptingOrders !== payload.acceptingOrders) {
      record.acceptingOrders = payload.acceptingOrders;
      current = await this.repo.save(record);
    }
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([current.userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(current, tiers, profiles.get(current.userId));
  }
}
