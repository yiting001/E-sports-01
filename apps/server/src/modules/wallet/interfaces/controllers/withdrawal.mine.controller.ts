import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, WithdrawalView } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ListMyWithdrawalsUseCase } from '../../application/use-cases/list-my-withdrawals.usecase';

/** 路由：分页查询我的提现记录（GET /wallet/withdrawals/mine）；仅登录态，所有角色可用 */
@Controller('wallet')
export class WithdrawalMineController {
  constructor(private readonly useCase: ListMyWithdrawalsUseCase) {}

  @Get('withdrawals/mine')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<WithdrawalView>> {
    return this.useCase.execute(
      user.id,
      query.page,
      query.pageSize,
      query.skip,
    );
  }
}
