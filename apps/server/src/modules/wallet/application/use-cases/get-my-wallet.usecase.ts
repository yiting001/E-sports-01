import { Injectable } from '@nestjs/common';
import { WalletView } from '@app/contracts';
import { WalletService } from '../wallet.service';
import { toWalletView } from '../wallet.mapper';

/**
 * 用例：获取当前用户钱包。
 * 钱包为所有角色通用，打开页面时若无则自动初始化（懒创建）。
 */
@Injectable()
export class GetMyWalletUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(userId: string): Promise<WalletView> {
    const wallet = await this.walletService.ensureWallet(userId);
    return toWalletView(wallet);
  }
}
