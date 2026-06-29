import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, WalletAdminView } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ListWalletsUseCase } from '../../application/use-cases/list-wallets.usecase';

/**
 * 路由：管理端分页查询所有用户钱包（GET /wallet/admin/wallets）。
 * 需 wallet:admin:list 权限；支持按用户名/昵称关键字检索。
 */
@Controller('wallet/admin')
export class WalletAdminListController {
  constructor(private readonly useCase: ListWalletsUseCase) {}

  @Get('wallets')
  @Permissions(PERMS.wallet.list)
  list(
    @Query() query: PaginationQueryDto,
    @Query('keyword') keyword?: string,
  ): Promise<PaginatedResult<WalletAdminView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, keyword);
  }
}
