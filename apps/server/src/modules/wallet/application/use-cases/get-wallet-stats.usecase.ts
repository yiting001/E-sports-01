import { Inject, Injectable } from '@nestjs/common';
import { WalletStatsView } from '@app/contracts';
import {
  RECHARGE_ORDER_REPOSITORY,
  RechargeOrderRepository,
} from '../../domain/recharge-repository.interface';
import {
  WITHDRAWAL_ORDER_REPOSITORY,
  WithdrawalOrderRepository,
} from '../../domain/withdrawal-repository.interface';
import { WalletService } from '../wallet.service';
import { toWalletStatsView } from '../wallet.mapper';

/**
 * 用例：获取当前用户钱包统计。
 * 汇总余额、累计充值/提现金额与成功笔数；钱包不存在时自动初始化。
 */
@Injectable()
export class GetWalletStatsUseCase {
  constructor(
    private readonly walletService: WalletService,
    @Inject(RECHARGE_ORDER_REPOSITORY)
    private readonly rechargeRepo: RechargeOrderRepository,
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async execute(userId: string): Promise<WalletStatsView> {
    const wallet = await this.walletService.ensureWallet(userId);
    const [rechargeCount, withdrawCount] = await Promise.all([
      this.rechargeRepo.countPaidByWallet(wallet.id),
      this.withdrawalRepo.countSuccessByWallet(wallet.id),
    ]);
    return toWalletStatsView(wallet, rechargeCount, withdrawCount);
  }
}
