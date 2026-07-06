import type {
  CreateRechargeBody,
  CreateRechargeResult,
  CreateWithdrawalBody,
  PaginatedResult,
  RechargeStatusView,
  WalletTransactionView,
  WalletView,
  WithdrawalResultView,
  WithdrawalView,
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
  /** 主动查询充值支付结果（调渠道官方查单兜底，回调未达也能确认入账） */
  rechargeStatus(outTradeNo: string): Promise<RechargeStatusView> {
    return http.get(`/wallet/recharge/${outTradeNo}/status`);
  },
  /** 发起提现（支付宝转账） */
  withdraw(body: CreateWithdrawalBody): Promise<WithdrawalResultView> {
    return http.post('/wallet/withdrawal', body);
  },
  /** 分页查询我的提现记录（含审核状态/到账金额/失败原因） */
  myWithdrawals(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<WithdrawalView>> {
    return http.get('/wallet/withdrawals/mine', { params: { page, pageSize } });
  },
};
