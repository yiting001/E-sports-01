import {
  PayoutProvider,
  WalletStatsView,
  WalletView,
  WithdrawTaxTier,
  fenToYuan,
} from '@app/contracts';
import { WalletEntity } from '../domain/wallet.entity';

/** 钱包视图中的提现规则（费率 / 阶梯税费 / 当前网关可选方式） */
export interface WalletWithdrawRules {
  withdrawFeeRateBp: number;
  withdrawTaxTiers: WithdrawTaxTier[];
  withdrawMethods: PayoutProvider[];
  withdrawPhoneRequired: boolean;
}

/** 实体 + 当前提现规则 → 钱包视图 */
export function toWalletView(
  wallet: WalletEntity,
  rules: WalletWithdrawRules,
): WalletView {
  return {
    id: wallet.id,
    balanceFen: wallet.balanceFen,
    balanceYuan: fenToYuan(wallet.balanceFen),
    status: wallet.status,
    ...rules,
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
