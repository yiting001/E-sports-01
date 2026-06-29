import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginatedResult, WalletTransactionView } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ListUserTransactionsUseCase } from '../../application/use-cases/list-user-transactions.usecase';

/**
 * 路由：管理端分页查询指定用户钱包流水（GET /wallet/admin/wallets/:userId/transactions）。
 * 需 wallet:admin:transaction 权限。
 */
@Controller('wallet/admin')
export class WalletAdminTransactionsController {
  constructor(private readonly useCase: ListUserTransactionsUseCase) {}

  @Get('wallets/:userId/transactions')
  @Permissions(PERMS.wallet.transaction)
  list(
    @Param('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<WalletTransactionView>> {
    return this.useCase.execute(userId, query.page, query.pageSize, query.skip);
  }
}
