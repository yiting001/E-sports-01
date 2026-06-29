import { WalletAdminView, WalletStatus, fenToYuan } from '@app/contracts';
import { WalletEntity } from '../domain/wallet.entity';

/** 用户展示资料（管理列表展示提交人） */
export interface AdminUserBrief {
  userId: string;
  username: string;
  nickname: string;
}

/**
 * 用户 + 其钱包（可为空）→ 管理端列表视图。
 * 未开通钱包（wallet 为 null）时以零值展示，initialized=false，
 * 便于管理员对尚未初始化的用户也能查看并人工调整（调整时按需懒创建）。
 */
export function toWalletAdminView(
  user: AdminUserBrief,
  wallet: WalletEntity | null,
): WalletAdminView {
  const balanceFen = wallet?.balanceFen ?? 0;
  const totalRechargeFen = wallet?.totalRechargeFen ?? 0;
  const totalWithdrawFen = wallet?.totalWithdrawFen ?? 0;
  return {
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
    initialized: wallet !== null,
    balanceFen,
    balanceYuan: fenToYuan(balanceFen),
    totalRechargeFen,
    totalRechargeYuan: fenToYuan(totalRechargeFen),
    totalWithdrawFen,
    totalWithdrawYuan: fenToYuan(totalWithdrawFen),
    status: wallet?.status ?? WalletStatus.Active,
  };
}
