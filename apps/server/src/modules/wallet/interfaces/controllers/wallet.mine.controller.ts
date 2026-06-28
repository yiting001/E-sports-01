import { Controller, Get } from '@nestjs/common';
import { WalletView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetMyWalletUseCase } from '../../application/use-cases/get-my-wallet.usecase';

/**
 * 路由：获取当前用户钱包（GET /wallet/mine）。
 * 需 wallet:view 权限；钱包不存在则自动初始化。
 */
@Controller('wallet')
export class WalletMineController {
  constructor(private readonly useCase: GetMyWalletUseCase) {}

  @Get('mine')
  @Permissions(PERMS.wallet.view)
  mine(@CurrentUser() user: AuthUser): Promise<WalletView> {
    return this.useCase.execute(user.id);
  }
}
