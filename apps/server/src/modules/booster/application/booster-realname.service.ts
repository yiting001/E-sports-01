import { ForbiddenException, Injectable } from '@nestjs/common';
import { RealnameChecker } from '../../realname/application/realname-checker.service';
import { BoosterPolicyService } from './booster-policy.service';

/**
 * 打手实名门禁服务（模块对外口，供订单模块在接单/指派时调用）。
 * 后台开启实名前置开关时，未通过实名认证的打手禁止接单；开关关闭则直接放行。
 */
@Injectable()
export class BoosterRealnameGuard {
  constructor(
    private readonly policy: BoosterPolicyService,
    private readonly realname: RealnameChecker,
  ) {}

  /** 断言实名要求已满足（开关关闭不校验；开启时须实名审核通过） */
  async assertApproved(userId: string): Promise<void> {
    if (!(await this.policy.isRealnameRequired())) {
      return;
    }
    if (!(await this.realname.isApproved(userId))) {
      throw new ForbiddenException('平台要求打手实名认证，请先完成实名认证后再接单');
    }
  }
}
