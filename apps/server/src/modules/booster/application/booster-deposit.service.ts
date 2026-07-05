import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../domain/booster-repository.interface';
import { BoosterPolicyService } from './booster-policy.service';

/**
 * 打手押金门禁服务（模块对外口，供订单模块在接单时调用）。
 * 校验打手已缴押金达到配置的最低交付额，未达门槛则禁止接单。
 */
@Injectable()
export class BoosterDepositGuard {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly policy: BoosterPolicyService,
  ) {}

  /** 断言押金已达最低交付额（最低额为 0 表示不要求押金，直接放行） */
  async assertPaid(userId: string): Promise<void> {
    const { minFen } = await this.policy.getDepositPolicy();
    if (minFen <= 0) {
      return;
    }
    const record = await this.repo.findByUserId(userId);
    if (!record || record.depositFen < minFen) {
      throw new ForbiddenException('押金未达最低交付额，请先缴纳后再接单');
    }
  }
}
