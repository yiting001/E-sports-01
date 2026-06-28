import { Controller, Get } from '@nestjs/common';
import { WalletStatsView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetWalletStatsUseCase } from '../../application/use-cases/get-wallet-stats.usecase';

/** 路由：获取当前用户钱包统计（GET /wallet/stats） */
@Controller('wallet')
export class WalletStatsController {
  constructor(private readonly useCase: GetWalletStatsUseCase) {}

  @Get('stats')
  @Permissions(PERMS.wallet.view)
  stats(@CurrentUser() user: AuthUser): Promise<WalletStatsView> {
    return this.useCase.execute(user.id);
  }
}
