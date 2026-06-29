import { Inject, Injectable } from '@nestjs/common';
import { AdjustWalletBody, WalletAdminView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { WALLET_LEDGER, WalletLedger } from '../../domain/ledger.interface';
import { WalletService } from '../wallet.service';
import { toWalletAdminView } from '../wallet-admin.mapper';

/**
 * 用例：管理端人工调整指定用户钱包余额（增加/扣减）。
 * 钱包不存在则懒创建后调整；余额变更与流水写入收敛在 WalletLedger 同一事务内，
 * 保证一致性。返回调整后的管理端视图。
 */
@Injectable()
export class AdjustWalletUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly users: UserDirectory,
    @Inject(WALLET_LEDGER) private readonly ledger: WalletLedger,
  ) {}

  async execute(
    userId: string,
    body: AdjustWalletBody,
  ): Promise<WalletAdminView> {
    const wallet = await this.walletService.ensureWallet(userId);
    const adjusted = await this.ledger.adjustBalance({
      walletId: wallet.id,
      direction: body.direction,
      amountFen: body.amountFen,
      remark: body.remark,
    });
    const profiles = await this.users.resolveProfiles([userId]);
    const profile = profiles.get(userId);
    return toWalletAdminView(
      {
        userId,
        username: profile?.username ?? '',
        nickname: profile?.nickname ?? '',
      },
      adjusted,
    );
  }
}
