import { Injectable } from '@nestjs/common';
import { MemberLevelTier } from '@app/contracts';
import { MemberLevelService } from '../member-level.service';

/** 用例：查询会员等级档位（登录即可，C 端展示晋升规则 / 管理端编辑回显共用） */
@Injectable()
export class GetMemberLevelsUseCase {
  constructor(private readonly levels: MemberLevelService) {}

  execute(): Promise<MemberLevelTier[]> {
    return this.levels.getTiers();
  }
}
