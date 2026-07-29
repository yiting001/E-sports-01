import { Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  WALLET_DEFAULTS,
  WalletView,
  WithdrawTaxTier,
  sanitizeWithdrawTaxTiers,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { WalletService } from '../wallet.service';
import { toWalletView } from '../wallet.mapper';

/**
 * 用例：获取当前用户钱包。
 * 钱包为所有角色通用，打开页面时若无则自动初始化（懒创建）。
 */
@Injectable()
export class GetMyWalletUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: string): Promise<WalletView> {
    const wallet = await this.walletService.ensureWallet(userId);
    const feeRateBp = await this.config.getNumber(
      CONFIG_KEYS.wallet.withdrawFeeRateBp,
      WALLET_DEFAULTS.withdrawFeeRateBp,
    );
    const taxTiers = sanitizeWithdrawTaxTiers(
      await this.config.getJson<WithdrawTaxTier[]>(
        CONFIG_KEYS.wallet.withdrawTaxTiers,
        [],
      ),
    );
    return toWalletView(wallet, feeRateBp, taxTiers);
  }
}
