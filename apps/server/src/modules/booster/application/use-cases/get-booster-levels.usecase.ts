import { Injectable } from '@nestjs/common';
import { BoosterLevelTier } from '@app/contracts';
import { BoosterPolicyService } from '../booster-policy.service';

/** 用例：查询打手等级档位（登录即可，C 端展示晋升规则 / 管理端编辑回显共用） */
@Injectable()
export class GetBoosterLevelsUseCase {
  constructor(private readonly policy: BoosterPolicyService) {}

  execute(): Promise<BoosterLevelTier[]> {
    return this.policy.getLevelTiers();
  }
}
