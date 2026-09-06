import { WithdrawalAdminView, fenToYuan } from '@app/contracts';
import { WithdrawalOrderEntity } from '../domain/withdrawal-order.entity';
import { maskIdCardNo, maskPayoutAccount, maskPhone } from './payout-masking';

/** 提现单归属用户的展示资料 */
export interface WithdrawalUserBrief {
  userId: string;
  username: string;
  nickname: string;
}

/**
 * 提现订单 + 归属用户 → 管理端列表视图。
 * 金额/手续费/到账额统一换算「元」展示字符串，前端只读不参与计算；
 * 银行卡号/openid、身份证号、手机号均脱敏后下发，打款由服务端按存库原值执行。
 */
export function toWithdrawalAdminView(
  order: WithdrawalOrderEntity,
  user: WithdrawalUserBrief,
): WithdrawalAdminView {
  const arriveFen = order.amountFen - order.feeFen;
  return {
    id: order.id,
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
    amountFen: order.amountFen,
    amountYuan: fenToYuan(order.amountFen),
    feeFen: order.feeFen,
    feeYuan: fenToYuan(order.feeFen),
    arriveFen,
    arriveYuan: fenToYuan(arriveFen),
    provider: order.provider,
    status: order.status,
    account: maskPayoutAccount(order.provider, order.account),
    accountName: order.accountName,
    idCardNo: maskIdCardNo(order.idCardNo),
    bankName: order.bankName,
    phone: maskPhone(order.phone),
    providerOrderId: order.providerOrderId,
    channelOrderNo: order.channelOrderNo,
    channelState: order.channelState,
    channelErrMsg: order.channelErrMsg,
    channelFeeFen: order.channelFeeFen,
    channelFeeYuan: fenToYuan(order.channelFeeFen),
    channelSyncedAt: order.channelSyncedAt?.toISOString() ?? null,
    failReason: order.failReason,
    createdAt: order.createdAt.toISOString(),
  };
}
