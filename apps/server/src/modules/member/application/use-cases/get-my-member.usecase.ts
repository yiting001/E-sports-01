import { Injectable } from '@nestjs/common';
import { MemberMineView } from '@app/contracts';
import { MemberLevelService } from '../member-level.service';

/** 用例：获取当前用户会员概览（等级、折扣、累计消费、晋升进度） */
@Injectable()
export class GetMyMemberUseCase {
  constructor(private readonly levels: MemberLevelService) {}

  execute(userId: string): Promise<MemberMineView> {
    return this.levels.getMineView(userId);
  }
}
