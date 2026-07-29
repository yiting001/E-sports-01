import { WithdrawalAdminView, fenToYuan } from '@app/contracts';
import { WithdrawalOrderEntity } from '../domain/withdrawal-order.entity';

/** 提现单归属用户的展示资料 */
export interface WithdrawalUserBrief {
  userId: string;
  username: string;
  nickname: string;
}

/**
 * 提现订单 + 归属用户 → 管理端列表视图。
 * 金额/手续费/到账额统一换算「元」展示字符串，前端只读不参与计算。
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
    account: order.account,
    accountName: order.accountName,
    idCardNo: order.idCardNo,
    providerOrderId: order.providerOrderId,
    failReason: order.failReason,
    createdAt: order.createdAt.toISOString(),
  };
}
