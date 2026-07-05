import { Injectable } from '@nestjs/common';
import { BoosterDepositPolicy } from '@app/contracts';
import { BoosterPolicyService } from '../booster-policy.service';

/** 用例：保存押金交付策略（管理端），校验后写入配置中心，立即对缴纳与接单门禁生效 */
@Injectable()
export class SetDepositPolicyUseCase {
  constructor(private readonly policy: BoosterPolicyService) {}

  execute(policy: BoosterDepositPolicy): Promise<BoosterDepositPolicy> {
    return this.policy.setDepositPolicy(policy);
  }
}
