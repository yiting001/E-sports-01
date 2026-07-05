import { Injectable } from '@nestjs/common';
import { MemberLevelTier } from '@app/contracts';
import { MemberLevelService } from '../member-level.service';

/** 用例：保存会员等级档位（管理端），校验后写入配置中心 */
@Injectable()
export class SetMemberLevelsUseCase {
  constructor(private readonly levels: MemberLevelService) {}

  execute(tiers: MemberLevelTier[]): Promise<MemberLevelTier[]> {
    return this.levels.setTiers(tiers);
  }
}
