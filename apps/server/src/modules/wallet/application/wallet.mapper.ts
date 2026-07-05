import { WalletStatsView, WalletView, fenToYuan } from '@app/contracts';
import { WalletEntity } from '../domain/wallet.entity';

/** 实体 + 当前手续费率 → 钱包视图 */
export function toWalletView(
  wallet: WalletEntity,
  withdrawFeeRateBp: number,
): WalletView {
  return {
    id: wallet.id,
    balanceFen: wallet.balanceFen,
    balanceYuan: fenToYuan(wallet.balanceFen),
    status: wallet.status,
    withdrawFeeRateBp,
  };
}

/** 实体 + 笔数 → 钱包统计视图 */
export function toWalletStatsView(
  wallet: WalletEntity,
  rechargeCount: number,
  withdrawCount: number,
): WalletStatsView {
  return {
    balanceFen: wallet.balanceFen,
    balanceYuan: fenToYuan(wallet.balanceFen),
    totalRechargeFen: wallet.totalRechargeFen,
    totalRechargeYuan: fenToYuan(wallet.totalRechargeFen),
    totalWithdrawFen: wallet.totalWithdrawFen,
    totalWithdrawYuan: fenToYuan(wallet.totalWithdrawFen),
    rechargeCount,
    withdrawCount,
  };
}
