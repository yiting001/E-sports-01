import type {
  AdjustWalletBody,
  CreateRechargeBody,
  CreateRechargeResult,
  CreateWithdrawalBody,
  PaginatedResult,
  PaginationQuery,
  WalletAdminView,
  WalletStatsView,
  WalletTransactionView,
  WalletView,
  WithdrawalResultView,
} from '@app/contracts';
import { http } from './http';

/** 钱包管理端列表查询入参（分页 + 用户名/昵称关键字） */
export interface WalletAdminListQuery extends PaginationQuery {
  keyword?: string;
}

/** 钱包相关接口（所有登录角色通用） */
export const walletApi = {
  /** 获取当前用户钱包（后端无则自动初始化） */
  mine(): Promise<WalletView> {
    return http.get('/wallet/mine');
  },
  /** 获取钱包统计 */
  stats(): Promise<WalletStatsView> {
    return http.get('/wallet/stats');
  },
  /** 分页查询钱包流水/明细 */
  transactions(
    query: PaginationQuery,
  ): Promise<PaginatedResult<WalletTransactionView>> {
    return http.get('/wallet/transactions', { params: query });
  },
  /** 发起充值，返回扫码支付二维码内容 */
  recharge(body: CreateRechargeBody): Promise<CreateRechargeResult> {
    return http.post('/wallet/recharge', body);
  },
  /** 发起提现（支付宝转账） */
  withdraw(body: CreateWithdrawalBody): Promise<WithdrawalResultView> {
    return http.post('/wallet/withdrawal', body);
  },
};

/** 钱包管理端接口（RBAC 门控：钱包管理） */
export const walletAdminApi = {
  /** 分页查询所有用户钱包（按用户聚合，支持关键字检索） */
  listWallets(
    query: WalletAdminListQuery,
  ): Promise<PaginatedResult<WalletAdminView>> {
    return http.get('/wallet/admin/wallets', { params: query });
  },
  /** 分页查询指定用户的钱包流水/明细 */
  userTransactions(
    userId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResult<WalletTransactionView>> {
    return http.get(`/wallet/admin/wallets/${userId}/transactions`, {
      params: query,
    });
  },
  /** 人工调整指定用户余额（增加/扣减并记流水） */
  adjust(userId: string, body: AdjustWalletBody): Promise<WalletAdminView> {
    return http.post(`/wallet/admin/wallets/${userId}/adjust`, body);
  },
};
