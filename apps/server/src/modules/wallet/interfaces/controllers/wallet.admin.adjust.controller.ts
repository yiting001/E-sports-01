import { Body, Controller, Param, Post } from '@nestjs/common';
import { WalletAdminView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { AdjustWalletUseCase } from '../../application/use-cases/adjust-wallet.usecase';
import { AdjustWalletDto } from '../dto/adjust-wallet.dto';

/**
 * 路由：管理端人工调整指定用户钱包余额（POST /wallet/admin/wallets/:userId/adjust）。
 * 需 wallet:admin:adjust 权限；钱包不存在则懒创建后调整。
 */
@Controller('wallet/admin')
export class WalletAdminAdjustController {
  constructor(private readonly useCase: AdjustWalletUseCase) {}

  @Post('wallets/:userId/adjust')
  @Permissions(PERMS.wallet.adjust)
  adjust(
    @Param('userId') userId: string,
    @Body() dto: AdjustWalletDto,
  ): Promise<WalletAdminView> {
    return this.useCase.execute(userId, dto);
  }
}
