import { Injectable } from '@nestjs/common';
import { BoosterServiceRegionOption } from '@app/contracts';
import { BoosterPolicyService } from '../booster-policy.service';

/**
 * 用例：保存接单区服选项（管理端打手管理）。
 * 校验后写入配置中心，立即对入驻表单选项与提交校验生效。
 */
@Injectable()
export class SetBoosterRegionsUseCase {
  constructor(private readonly policy: BoosterPolicyService) {}

  execute(
    options: BoosterServiceRegionOption[],
  ): Promise<BoosterServiceRegionOption[]> {
    return this.policy.setServiceRegionOptions(options);
  }
}
