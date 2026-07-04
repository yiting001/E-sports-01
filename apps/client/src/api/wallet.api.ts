import type {
  CreateRechargeBody,
  CreateRechargeResult,
  CreateWithdrawalBody,
  PaginatedResult,
  WalletTransactionView,
  WalletView,
  WithdrawalResultView,
} from '@app/contracts';
import { http } from './http';

/** C 端钱包接口：余额 / 充值 / 提现 / 流水（直连既有后端钱包模块） */
export const walletApi = {
  /** 我的钱包（不存在自动初始化） */
  mine(): Promise<WalletView> {
    return http.get('/wallet/mine');
  },
  /** 分页查询我的流水明细 */
  transactions(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<WalletTransactionView>> {
    return http.get('/wallet/transactions', { params: { page, pageSize } });
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
