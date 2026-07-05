import { Injectable } from '@nestjs/common';
import { BoosterDepositPolicy } from '@app/contracts';
import { BoosterPolicyService } from '../booster-policy.service';

/** 用例：查询押金交付策略（登录即可，C 端展示缴纳区间 / 管理端编辑回显共用） */
@Injectable()
export class GetDepositPolicyUseCase {
  constructor(private readonly policy: BoosterPolicyService) {}

  execute(): Promise<BoosterDepositPolicy> {
    return this.policy.getDepositPolicy();
  }
}
