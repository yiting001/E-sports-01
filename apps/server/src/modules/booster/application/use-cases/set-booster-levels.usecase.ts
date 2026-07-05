import { Injectable } from '@nestjs/common';
import { BoosterLevelTier } from '@app/contracts';
import { BoosterPolicyService } from '../booster-policy.service';

/** 用例：保存打手等级档位（管理端），校验后写入配置中心并按门槛重排等级序号 */
@Injectable()
export class SetBoosterLevelsUseCase {
  constructor(private readonly policy: BoosterPolicyService) {}

  execute(tiers: BoosterLevelTier[]): Promise<BoosterLevelTier[]> {
    return this.policy.setLevelTiers(tiers);
  }
}
