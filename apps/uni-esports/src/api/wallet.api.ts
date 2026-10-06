import type {
  CreateRechargeBody,
  CreateRechargeResult,
  PaginatedResult,
  RechargeStatusView,
  WalletTransactionView,
  WalletView,
} from '@app/contracts';
import { http } from './http';

/**
 * C 端钱包接口：余额 / 充值 / 流水。
 * 提现依赖支付宝/银行卡渠道（小程序内无对应场景），小程序端不接入，见 docs/uni-esports.md。
 */
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

  /** 发起充值：返回拉起支付参数或二维码内容（小程序内仅支持可拉起收银台的渠道） */
  recharge(body: CreateRechargeBody): Promise<CreateRechargeResult> {
    return http.post('/wallet/recharge', body);
  },

  /** 主动查询充值支付结果（渠道查单兜底，回调未达也能确认入账） */
  rechargeStatus(outTradeNo: string): Promise<RechargeStatusView> {
    return http.get(`/wallet/recharge/${outTradeNo}/status`, {
      silent: true,
    });
  },
};
