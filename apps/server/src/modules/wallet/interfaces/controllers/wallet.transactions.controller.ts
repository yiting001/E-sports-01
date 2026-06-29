import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, WalletTransactionView } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ListTransactionsUseCase } from '../../application/use-cases/list-transactions.usecase';

/** 路由：分页查询当前用户钱包流水/明细（GET /wallet/transactions）；仅登录态，所有角色可用 */
@Controller('wallet')
export class WalletTransactionsController {
  constructor(private readonly useCase: ListTransactionsUseCase) {}

  @Get('transactions')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<WalletTransactionView>> {
    return this.useCase.execute(
      user.id,
      query.page,
      query.pageSize,
      query.skip,
    );
  }
}
