import { Controller, Get } from '@nestjs/common';
import { MemberLevelTier } from '@app/contracts';
import { GetMemberLevelsUseCase } from '../../application/use-cases/get-member-levels.usecase';

/**
 * 路由：查询会员等级档位（GET /member/levels）。
 * 仅登录态：C 端展示晋升规则与折扣，管理端编辑时回显。
 */
@Controller('member')
export class MemberLevelsGetController {
  constructor(private readonly useCase: GetMemberLevelsUseCase) {}

  @Get('levels')
  levels(): Promise<MemberLevelTier[]> {
    return this.useCase.execute();
  }
}
