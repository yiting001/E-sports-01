import type {
  CreateRechargeBody,
  CreateRechargeResult,
  CreateWithdrawalBody,
  PaginatedResult,
  PaginationQuery,
  WalletStatsView,
  WalletTransactionView,
  WalletView,
  WithdrawalResultView,
} from '@app/contracts';
import { http } from './http';

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
