import { Inject, Injectable } from '@nestjs/common';
import { WalletTxnType } from '@app/contracts';
import {
  WALLET_REPOSITORY,
  WalletRepository,
} from '../domain/wallet-repository.interface';
import {
  WALLET_TRANSACTION_REPOSITORY,
  WalletTransactionRepository,
} from '../domain/transaction-repository.interface';
import {
  WITHDRAWAL_ORDER_REPOSITORY,
  WithdrawalOrderRepository,
} from '../domain/withdrawal-repository.interface';

/** 用户维度的钱包资金快照（金额均为分），供打手「我的资金」等只读聚合复用 */
export interface WalletFundsSnapshot {
  /** 可用余额 */
  balanceFen: number;
  /** 冻结金额（待审核/转账中的提现合计） */
  frozenFen: number;
  /** 累计提成入账合计 */
  totalCommissionFen: number;
  /** 本自然月提成入账合计 */
  monthCommissionFen: number;
  /** 上一自然月提成入账合计 */
  lastMonthCommissionFen: number;
}

/** 自然月区间：[本月一日, 下月一日) 与 [上月一日, 本月一日) */
function monthRanges(now: Date): {
  monthStart: Date;
  lastMonthStart: Date;
} {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { monthStart, lastMonthStart };
}

/**
 * 钱包财务只读查询服务。
 * 对外（打手模块）提供按用户聚合的余额/冻结/提成结算快照，
 * 只读不加锁，未开通钱包按零值返回。
 */
@Injectable()
export class WalletFinanceReadService {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: WalletRepository,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly transactionRepo: WalletTransactionRepository,
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async getFundsSnapshot(userId: string): Promise<WalletFundsSnapshot> {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
      return {
        balanceFen: 0,
        frozenFen: 0,
        totalCommissionFen: 0,
        monthCommissionFen: 0,
        lastMonthCommissionFen: 0,
      };
    }
    const { monthStart, lastMonthStart } = monthRanges(new Date());
    const [frozenFen, totalCommissionFen, monthCommissionFen, lastMonthCommissionFen] =
      await Promise.all([
        this.withdrawalRepo.sumFrozenByWallet(wallet.id),
        this.transactionRepo.sumInboundByType(
          wallet.id,
          WalletTxnType.Commission,
        ),
        this.transactionRepo.sumInboundByType(
          wallet.id,
          WalletTxnType.Commission,
          monthStart,
        ),
        this.transactionRepo.sumInboundByType(
          wallet.id,
          WalletTxnType.Commission,
          lastMonthStart,
          monthStart,
        ),
      ]);
    return {
      balanceFen: wallet.balanceFen,
      frozenFen,
      totalCommissionFen,
      monthCommissionFen,
      lastMonthCommissionFen,
    };
  }
}
