import { Body, Controller, Post } from '@nestjs/common';
import { WithdrawalResultView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { CreateWithdrawalUseCase } from '../../application/use-cases/create-withdrawal.usecase';
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';

/** 路由：发起提现（支付宝转账，POST /wallet/withdrawal） */
@Controller('wallet')
export class WithdrawalCreateController {
  constructor(private readonly useCase: CreateWithdrawalUseCase) {}

  @Post('withdrawal')
  @Permissions(PERMS.wallet.withdraw)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<WithdrawalResultView> {
    return this.useCase.execute(user.id, dto);
  }
}
