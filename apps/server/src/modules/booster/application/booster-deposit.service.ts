import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../domain/booster-repository.interface';
import { BoosterPolicyService } from './booster-policy.service';

/**
 * 打手押金门禁服务（模块对外口，供订单模块在接单时调用）。
 * 校验打手已足额缴纳配置中心设定的押金，未缴足则禁止接单。
 */
@Injectable()
export class BoosterDepositGuard {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly policy: BoosterPolicyService,
  ) {}

  /** 断言押金已缴足（配置为 0 表示不要求押金，直接放行） */
  async assertPaid(userId: string): Promise<void> {
    const required = await this.policy.getDepositRequiredFen();
    if (required <= 0) {
      return;
    }
    const record = await this.repo.findByUserId(userId);
    if (!record || record.depositFen < required) {
      throw new ForbiddenException('请先缴足押金后再接单');
    }
  }
}
