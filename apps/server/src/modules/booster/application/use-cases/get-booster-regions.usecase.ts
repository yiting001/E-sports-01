import { Injectable } from '@nestjs/common';
import { BoosterServiceRegionOption } from '@app/contracts';
import { BoosterPolicyService } from '../booster-policy.service';

/**
 * 用例：查询接单区服选项。
 * 管理端配置回显与 C 端入驻表单共用；未配置时回退契约默认两个区服。
 */
@Injectable()
export class GetBoosterRegionsUseCase {
  constructor(private readonly policy: BoosterPolicyService) {}

  execute(): Promise<BoosterServiceRegionOption[]> {
    return this.policy.getServiceRegionOptions();
  }
}
