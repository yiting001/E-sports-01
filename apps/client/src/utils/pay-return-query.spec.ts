import { describe, expect, it, vi } from 'vitest';
import {
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderStatus,
  PayReturnKind,
  RechargeStatus,
  type OrderView,
} from '@app/contracts';
import { queryPayReturnResult, type PayReturnQueryPorts } from './pay-return-query';

function orderView(status: OrderStatus, paidAt = ''): OrderView {
  return {
    id: 'order-1',
    orderNo: 'O1',
    productId: 'p1',
    productTitle: '陪玩',
    productCover: '',
    productCoverSub: '',
    quantity: 1,
    amountFen: 1000,
    amountYuan: '10.00',
    originalAmountFen: 1000,
    discountBp: 10000,
    couponDeductionFen: 0,
    commissionFen: 0,
    commissionRateBp: 0,
    provider: OrderPaymentMethod.Wechat,
    status,
    canRequestRefund: false,
    refund: null,
    remark: '',
    remarkMedia: [],
    accountInfo: '',
    boosterId: '',
    boosterName: '',
    gameAccountId: '',
    gameTextId: '',
    serviceRegion: '',
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
    requestedBoosterId: '',
    requestedBoosterName: '',
    createdAt: '2026-07-22T00:00:00.000Z',
    paidAt,
    dispatchedAt: '',
    acceptedAt: '',
    completedAt: '',
    cancelledAt: '',
    conversationId: '',
  };
}

function ports(
  recharge: RechargeStatus = RechargeStatus.Pending,
  order: OrderView = orderView(OrderStatus.PendingPayment),
): PayReturnQueryPorts & { rechargeStatus: ReturnType<typeof vi.fn>; orderPayQuery: ReturnType<typeof vi.fn> } {
  return {
    rechargeStatus: vi.fn(async (outTradeNo: string) => ({ outTradeNo, status: recharge })),
    orderPayQuery: vi.fn(async () => order),
  };
}

describe('queryPayReturnResult', () => {
  it('充值回跳以充值单状态为准：已支付/待支付/已关闭', async () => {
    const params = { kind: PayReturnKind.Recharge, ref: 'R1', action: null };
    const paid = ports(RechargeStatus.Paid);
    expect(await queryPayReturnResult(params, paid)).toBe('paid');
    expect(paid.rechargeStatus).toHaveBeenCalledWith('R1');
    expect(paid.orderPayQuery).not.toHaveBeenCalled();
    expect(await queryPayReturnResult(params, ports(RechargeStatus.Pending))).toBe('pending');
    expect(await queryPayReturnResult(params, ports(RechargeStatus.Closed))).toBe('closed');
  });

  it('订单回跳以订单支付状态为准：已支付/待支付/已取消', async () => {
    const params = { kind: PayReturnKind.Order, ref: 'order-1', action: null };
    const paid = ports(RechargeStatus.Pending, orderView(OrderStatus.PendingService, '2026-07-22T00:00:01.000Z'));
    expect(await queryPayReturnResult(params, paid)).toBe('paid');
    expect(paid.orderPayQuery).toHaveBeenCalledWith('order-1');
    expect(paid.rechargeStatus).not.toHaveBeenCalled();
    expect(
      await queryPayReturnResult(params, ports(RechargeStatus.Pending, orderView(OrderStatus.PendingPayment))),
    ).toBe('pending');
    expect(
      await queryPayReturnResult(params, ports(RechargeStatus.Pending, orderView(OrderStatus.Cancelled))),
    ).toBe('closed');
  });
});
