import { WalletTxnType } from '@app/contracts';
import { WalletTransactionEntity } from './wallet-transaction.entity';

/** 钱包流水仓储注入令牌 */
export const WALLET_TRANSACTION_REPOSITORY = Symbol(
  'WALLET_TRANSACTION_REPOSITORY',
);

/** 钱包流水仓储接口（明细只读查询；写入由 WalletLedger 在事务内完成） */
export interface WalletTransactionRepository {
  /** 按钱包分页查询流水，按时间倒序 */
  paginateByWallet(
    walletId: string,
    skip: number,
    take: number,
  ): Promise<[WalletTransactionEntity[], number]>;

  /** 求某钱包指定类型入账流水金额合计（可选时间区间 [from, to)，单位分） */
  sumInboundByType(
    walletId: string,
    type: WalletTxnType,
    from?: Date,
    to?: Date,
  ): Promise<number>;
}
