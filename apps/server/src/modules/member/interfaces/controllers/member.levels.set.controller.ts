import { Body, Controller, Put } from '@nestjs/common';
import { MemberLevelTier, PERMS } from '@app/contracts';
import { SetMemberLevelsUseCase } from '../../application/use-cases/set-member-levels.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { SetMemberLevelsDto } from '../dto/set-member-levels.dto';

/**
 * 路由：保存会员等级档位（PUT /member/levels）。
 * 需 member:level:set 权限；档位写入配置中心，立即对定级与下单折扣生效。
 */
@Controller('member')
export class MemberLevelsSetController {
  constructor(private readonly useCase: SetMemberLevelsUseCase) {}

  @Put('levels')
  @Permissions(PERMS.member.levelSet)
  save(@Body() dto: SetMemberLevelsDto): Promise<MemberLevelTier[]> {
    return this.useCase.execute(dto.tiers);
  }
}
