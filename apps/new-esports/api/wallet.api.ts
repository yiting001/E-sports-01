import type {
  CreateRechargeBody,
  CreateRechargeResult,
  RechargeStatusView,
} from '@app/contracts';
import type { PaginatedResult } from '@/types/commerce';
import type { WalletTransactionView, WalletView } from '@/types/wallet';
import { http } from './http';

/** C 端钱包接口：余额、流水与充值（小程序端走微信虚拟支付，回调后入账余额） */
export const walletApi = {
  /** 我的钱包（不存在时服务端自动初始化） */
  mine(): Promise<WalletView> {
    return http.get('/wallet/mine', { silent: true });
  },

  /** 分页查询我的余额流水明细 */
  transactions(page: number, pageSize: number): Promise<PaginatedResult<WalletTransactionView>> {
    return http.get('/wallet/transactions', { params: { page, pageSize }, silent: true });
  },

  /** 发起充值（微信小程序虚拟支付：服务端签名后返回拉起参数） */
  recharge(body: CreateRechargeBody): Promise<CreateRechargeResult> {
    return http.post('/wallet/recharge', body);
  },

  /** 查询充值单支付结果（支付回调未达时兜底确认入账） */
  rechargeStatus(outTradeNo: string): Promise<RechargeStatusView> {
    return http.get(`/wallet/recharge/${outTradeNo}/status`, { silent: true });
  },
};
