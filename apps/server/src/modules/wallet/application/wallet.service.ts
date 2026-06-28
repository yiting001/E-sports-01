import { Inject, Injectable } from '@nestjs/common';
import {
  WALLET_REPOSITORY,
  WalletRepository,
} from '../domain/wallet-repository.interface';
import { WalletEntity } from '../domain/wallet.entity';

/**
 * 钱包应用服务。
 * 提供「取当前用户钱包，无则自动初始化」的懒创建能力，供各用例共享；
 * 并发下若唯一约束撞车则回查已存在钱包，保证幂等。
 */
@Injectable()
export class WalletService {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly walletRepo: WalletRepository,
  ) {}

  async ensureWallet(userId: string): Promise<WalletEntity> {
    const existing = await this.walletRepo.findByUserId(userId);
    if (existing) {
      return existing;
    }
    try {
      return await this.walletRepo.save(this.walletRepo.create(userId));
    } catch (error) {
      const concurrent = await this.walletRepo.findByUserId(userId);
      if (concurrent) {
        return concurrent;
      }
      throw error;
    }
  }
}
