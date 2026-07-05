import { Body, Controller, Post } from '@nestjs/common';
import { PenaltyView, PERMS } from '@app/contracts';
import { CreatePenaltyUseCase } from '../../application/use-cases/create-penalty.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { CreatePenaltyDto } from '../dto/create-penalty.dto';

/**
 * 路由：财务对打手创建罚款（POST /finance/penalties）。
 * 需 finance:penalty:create 权限；按来源从余额（记流水）或押金（核减）扣除。
 */
@Controller('finance/penalties')
export class PenaltyCreateController {
  constructor(private readonly useCase: CreatePenaltyUseCase) {}

  @Post()
  @Permissions(PERMS.finance.penaltyCreate)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePenaltyDto,
  ): Promise<PenaltyView> {
    return this.useCase.execute(user.id, dto);
  }
}
