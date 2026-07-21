import assert from 'node:assert/strict';
import test from 'node:test';
import { FeedbackStatus, FundDirection, PenaltySource, WalletTxnType } from '@app/contracts';
import {
  balanceRequest,
  FeedbackPenaltyHarness,
  makeBooster,
  makeFeedback,
  makeOrder,
  makeWallet,
  settle,
} from './feedback-penalty.settlement.helper';

test('余额处罚在同一事务写入钱包、流水、罚款和反馈', async () => {
  const feedback = makeFeedback();
  const wallet = makeWallet(1_000);
  const harness = new FeedbackPenaltyHarness({
    feedbacks: [feedback],
    orders: [makeOrder()],
    wallets: [wallet],
  });

  const result = await settle(harness);

  assert.equal(result, feedback);
  assert.equal(wallet.balanceFen, 700);
  assert.deepEqual(harness.locks, ['feedback', 'order', 'wallet']);
  assert.equal(harness.transactions.length, 1);
  assert.deepEqual(
    {
      walletId: harness.transactions[0]?.walletId,
      type: harness.transactions[0]?.type,
      direction: harness.transactions[0]?.direction,
      amountFen: harness.transactions[0]?.amountFen,
      balanceAfterFen: harness.transactions[0]?.balanceAfterFen,
      bizOrderId: harness.transactions[0]?.bizOrderId,
    },
    {
      walletId: wallet.id,
      type: WalletTxnType.Penalty,
      direction: FundDirection.Out,
      amountFen: 300,
      balanceAfterFen: 700,
      bizOrderId: feedback.id,
    },
  );
  assert.equal(harness.penalties.length, 1);
  assert.deepEqual(
    {
      tenantId: harness.penalties[0]?.tenantId,
      feedbackId: harness.penalties[0]?.feedbackId,
      boosterUserId: harness.penalties[0]?.boosterUserId,
      orderNo: harness.penalties[0]?.orderNo,
      amountFen: harness.penalties[0]?.amountFen,
      source: harness.penalties[0]?.source,
      reason: harness.penalties[0]?.reason,
      createdBy: harness.penalties[0]?.createdBy,
    },
    {
      tenantId: 'tenant-1',
      feedbackId: feedback.id,
      boosterUserId: 'booster-1',
      orderNo: 'ORDER-1',
      amountFen: 300,
      source: PenaltySource.Balance,
      reason: '服务质量未达标',
      createdBy: 'operator-1',
    },
  );
  assert.equal(feedback.status, FeedbackStatus.Resolved);
  assert.equal(feedback.replyContent, '投诉成立，已完成扣款。');
  assert.equal(feedback.handledBy, 'operator-1');
  assert.ok(feedback.handledAt instanceof Date);
  assert.equal(feedback.penaltyId, harness.penalties[0]?.id);
});

test('押金处罚仅扣押金并写入罚款和反馈', async () => {
  const feedback = makeFeedback();
  const booster = makeBooster(800);
  const harness = new FeedbackPenaltyHarness({
    feedbacks: [feedback],
    orders: [makeOrder()],
    boosters: [booster],
  });

  await settle(harness, { ...balanceRequest, source: PenaltySource.Deposit });

  assert.equal(booster.depositFen, 500);
  assert.deepEqual(harness.locks, ['feedback', 'order', 'booster']);
  assert.equal(harness.transactions.length, 0);
  assert.equal(harness.penalties.length, 1);
  assert.equal(harness.penalties[0]?.source, PenaltySource.Deposit);
  assert.equal(feedback.status, FeedbackStatus.Resolved);
  assert.equal(feedback.penaltyId, harness.penalties[0]?.id);
});

test('余额或押金不足时不留下部分写入', async (t) => {
  await t.test('钱包余额不足', async () => {
    const feedback = makeFeedback();
    const wallet = makeWallet(299);
    const harness = new FeedbackPenaltyHarness({
      feedbacks: [feedback],
      orders: [makeOrder()],
      wallets: [wallet],
    });

    await assert.rejects(settle(harness), /钱包余额不足，无法扣除/);
    assert.equal(wallet.balanceFen, 299);
    assert.equal(harness.transactions.length, 0);
    assert.equal(harness.penalties.length, 0);
    assert.equal(feedback.status, FeedbackStatus.Pending);
    assert.equal(feedback.penaltyId, null);
  });

  await t.test('押金余额不足', async () => {
    const feedback = makeFeedback();
    const booster = makeBooster(299);
    const harness = new FeedbackPenaltyHarness({
      feedbacks: [feedback],
      orders: [makeOrder()],
      boosters: [booster],
    });

    await assert.rejects(
      settle(harness, { ...balanceRequest, source: PenaltySource.Deposit }),
      /押金余额不足，无法从押金扣除/,
    );
    assert.equal(booster.depositFen, 299);
    assert.equal(harness.transactions.length, 0);
    assert.equal(harness.penalties.length, 0);
    assert.equal(feedback.status, FeedbackStatus.Pending);
    assert.equal(feedback.penaltyId, null);
  });
});

test('非法金额在资金写入前被拒绝', async () => {
  for (const amountFen of [0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const feedback = makeFeedback();
    const wallet = makeWallet(1_000);
    const harness = new FeedbackPenaltyHarness({
      feedbacks: [feedback],
      orders: [makeOrder()],
      wallets: [wallet],
    });

    await assert.rejects(
      settle(harness, { ...balanceRequest, amountFen }),
      /罚款金额须为安全正整数/,
    );
    assert.equal(wallet.balanceFen, 1_000);
    assert.equal(harness.transactions.length, 0);
    assert.equal(harness.penalties.length, 0);
    assert.equal(feedback.status, FeedbackStatus.Pending);
  }
});

test('相同请求并发仅扣款一次并返回同一处罚记录', async () => {
  const feedback = makeFeedback();
  const wallet = makeWallet(1_000);
  const harness = new FeedbackPenaltyHarness({
    feedbacks: [feedback],
    orders: [makeOrder()],
    wallets: [wallet],
  });

  const results = await Promise.all([settle(harness), settle(harness)]);

  assert.equal(wallet.balanceFen, 700);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.penalties.length, 1);
  assert.ok(results[0]?.penaltyId);
  assert.equal(results[0]?.penaltyId, results[1]?.penaltyId);
  assert.equal(results[0]?.penaltyId, harness.penalties[0]?.id);
});

test('已完成处罚使用不同参数重试时拒绝再次扣款', async () => {
  const wallet = makeWallet(1_000);
  const harness = new FeedbackPenaltyHarness({
    feedbacks: [makeFeedback()],
    orders: [makeOrder()],
    wallets: [wallet],
  });
  await settle(harness);

  await assert.rejects(
    settle(harness, { ...balanceRequest, amountFen: 301 }),
    /该反馈已按其他参数完成扣款/,
  );
  assert.equal(wallet.balanceFen, 700);
  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.penalties.length, 1);
});

test('跨租户订单、钱包或打手入驻记录均被拒绝', async (t) => {
  await t.test('非超管不能读取其他租户反馈', async () => {
    const harness = new FeedbackPenaltyHarness({
      feedbacks: [makeFeedback({ tenantId: 'tenant-2' })],
      orders: [makeOrder({ tenantId: 'tenant-2' })],
      wallets: [makeWallet(1_000, { tenantId: 'tenant-2' })],
    });

    await assert.rejects(settle(harness), /反馈记录不存在/);
    assert.equal(harness.penalties.length, 0);
    assert.equal(harness.transactions.length, 0);
  });

  await t.test('订单租户不一致', async () => {
    const harness = new FeedbackPenaltyHarness({
      feedbacks: [makeFeedback()],
      orders: [makeOrder({ tenantId: 'tenant-2' })],
      wallets: [makeWallet(1_000)],
    });

    await assert.rejects(settle(harness), /关联订单不存在或租户不一致/);
    assert.equal(harness.penalties.length, 0);
    assert.equal(harness.transactions.length, 0);
  });

  await t.test('钱包租户不一致', async () => {
    const wallet = makeWallet(1_000, { tenantId: 'tenant-2' });
    const harness = new FeedbackPenaltyHarness({
      feedbacks: [makeFeedback()],
      orders: [makeOrder()],
      wallets: [wallet],
    });

    await assert.rejects(settle(harness), /关联打手钱包不存在/);
    assert.equal(wallet.balanceFen, 1_000);
    assert.equal(harness.penalties.length, 0);
    assert.equal(harness.transactions.length, 0);
  });

  await t.test('打手用户不一致', async () => {
    const booster = makeBooster(1_000, { userId: 'booster-2' });
    const harness = new FeedbackPenaltyHarness({
      feedbacks: [makeFeedback()],
      orders: [makeOrder()],
      boosters: [booster],
    });

    await assert.rejects(
      settle(harness, { ...balanceRequest, source: PenaltySource.Deposit }),
      /关联打手入驻记录不存在/,
    );
    assert.equal(booster.depositFen, 1_000);
    assert.equal(harness.penalties.length, 0);
  });
});
