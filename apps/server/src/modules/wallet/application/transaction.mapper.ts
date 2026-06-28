import { WalletTransactionView, fenToYuan } from '@app/contracts';
import { WalletTransactionEntity } from '../domain/wallet-transaction.entity';

/** 实体 → 钱包流水（明细）视图 */
export function toTransactionView(
  txn: WalletTransactionEntity,
): WalletTransactionView {
  return {
    id: txn.id,
    type: txn.type,
    direction: txn.direction,
    amountFen: txn.amountFen,
    amountYuan: fenToYuan(txn.amountFen),
    balanceAfterFen: txn.balanceAfterFen,
    balanceAfterYuan: fenToYuan(txn.balanceAfterFen),
    bizOrderId: txn.bizOrderId,
    remark: txn.remark,
    createdAt: txn.createdAt.toISOString(),
  };
}
