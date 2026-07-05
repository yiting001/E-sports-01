import { Controller, Get, Query } from '@nestjs/common';
import {
  PaginatedResult,
  WithdrawalAdminView,
  WithdrawalStatus,
} from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { ListWithdrawalsUseCase } from '../../application/use-cases/list-withdrawals.usecase';

/**
 * 路由：财务分页查询提现工单（GET /wallet/admin/withdrawals）。
 * 需 finance:withdrawal:list 权限；支持按状态过滤。
 */
@Controller('wallet/admin')
export class WithdrawalAdminListController {
  constructor(private readonly useCase: ListWithdrawalsUseCase) {}

  @Get('withdrawals')
  @Permissions(PERMS.finance.withdrawalList)
  list(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: WithdrawalStatus,
  ): Promise<PaginatedResult<WithdrawalAdminView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, status);
  }
}
