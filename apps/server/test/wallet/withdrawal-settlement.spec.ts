import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PayoutChannelState, PayoutProvider, WithdrawalStatus } from '@app/contracts';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import { PayoutResolver } from '../../src/modules/wallet/application/payout.resolver';
import { ApproveWithdrawalUseCase } from '../../src/modules/wallet/application/use-cases/approve-withdrawal.usecase';
import { HandleWithdrawalCallbackUseCase } from '../../src/modules/wallet/application/use-cases/handle-withdrawal-callback.usecase';
import {
  PAYOUT_NOT_FOUND_GRACE_MS,
  SyncWithdrawalUseCase,
  canFailOnNotFound,
} from '../../src/modules/wallet/application/use-cases/sync-withdrawal.usecase';
import { WithdrawalSettlementService } from '../../src/modules/wallet/application/withdrawal-settlement.service';
import type {
  WalletLedger,
  WithdrawalChannelMeta,
} from '../../src/modules/wallet/domain/ledger.interface';
import {
  PayoutCallbackRequest,
  PayoutCallbackResult,
  PayoutExecutionStatus,
  PayoutInput,
  PayoutOutcomeUnknownError,
  PayoutPort,
  PayoutQueryInput,
  PayoutResult,
} from '../../src/modules/wallet/domain/payout-port.interface';
import { WithdrawalOrderEntity } from '../../src/modules/wallet/domain/withdrawal-order.entity';
import type { WithdrawalOrderRepository } from '../../src/modules/wallet/domain/withdrawal-repository.interface';

const NOTIFY_BASE = 'https://api.example.test';

function makeOrder(overrides: Partial<WithdrawalOrderEntity> = {}): WithdrawalOrderEntity {
  const order = new WithdrawalOrderEntity();
  order.id = 'wd-1';
  order.tenantId = 'default';
  order.walletId = 'wallet-1';
  order.outBizNo = 'W20260901000000000001';
  order.amountFen = 10_000;
  order.feeFen = 500;
  order.provider = PayoutProvider.JqfAlipay;
  order.status = WithdrawalStatus.Pending;
  order.account = 'a@b.com';
  order.accountName = '张三';
  order.idCardNo = null;
  order.providerOrderId = null;
  order.channelOrderNo = null;
  order.channelState = null;
  order.channelErrCode = null;
  order.channelErrMsg = null;
  order.channelFeeFen = 0;
  order.channelSyncedAt = null;
  order.failReason = null;
  order.createdAt = new Date('2026-09-01T00:00:00Z');
  order.updatedAt = new Date('2026-09-01T00:00:00Z');
  return Object.assign(order, overrides);
}

function result(status: PayoutExecutionStatus, extra: Partial<PayoutResult> = {}): PayoutResult {
  return {
    status,
    providerOrderId: 'T-1',
    channelOrderNo: 'CH-1',
    channelState: PayoutChannelState.Processing,
    channelErrCode: null,
    channelErrMsg: null,
    channelFeeFen: 15,
    failReason: '',
    ...extra,
  };
}

/** 内存账本：模拟 processing 单幂等推进与余额回滚计数 */
class FakeLedger implements WalletLedger {
  refunds = 0;
  successes = 0;
  syncs: Array<Partial<WithdrawalChannelMeta>> = [];
  constructor(readonly order: WithdrawalOrderEntity) {}

  creditRecharge(): Promise<boolean> {
    throw new Error('not used');
  }
  reserveWithdrawal(): Promise<WithdrawalOrderEntity> {
    throw new Error('not used');
  }
  adjustBalance(): never {
    throw new Error('not used');
  }
  async beginWithdrawalTransfer(orderId: string): Promise<WithdrawalOrderEntity | null> {
    if (orderId !== this.order.id || this.order.status !== WithdrawalStatus.Pending) {
      return null;
    }
    this.order.status = WithdrawalStatus.Processing;
    return this.order;
  }
  async markWithdrawalSuccess(orderId: string, meta: WithdrawalChannelMeta): Promise<boolean> {
    if (orderId !== this.order.id || this.order.status !== WithdrawalStatus.Processing) {
      return false;
    }
    this.order.status = WithdrawalStatus.Success;
    Object.assign(this.order, meta);
    this.successes += 1;
    return true;
  }
  async syncWithdrawalChannel(orderId: string, meta: Partial<WithdrawalChannelMeta>): Promise<void> {
    if (orderId === this.order.id && this.order.status === WithdrawalStatus.Processing) {
      Object.assign(this.order, meta);
      this.syncs.push(meta);
    }
  }
  async refundWithdrawal(
    orderId: string,
    reason: string,
    toStatus: WithdrawalStatus.Failed | WithdrawalStatus.Rejected,
    meta?: Partial<WithdrawalChannelMeta>,
  ): Promise<boolean> {
    if (
      orderId !== this.order.id ||
      (this.order.status !== WithdrawalStatus.Pending &&
        this.order.status !== WithdrawalStatus.Processing)
    ) {
      return false;
    }
    this.order.status = toStatus;
    this.order.failReason = reason;
    Object.assign(this.order, meta ?? {});
    this.refunds += 1;
    return true;
  }
}

class FakeRepo implements WithdrawalOrderRepository {
  constructor(readonly order: WithdrawalOrderEntity) {}
  async findById(id: string): Promise<WithdrawalOrderEntity | null> {
    return id === this.order.id ? this.order : null;
  }
  async findByOutBizNo(outBizNo: string): Promise<WithdrawalOrderEntity | null> {
    return outBizNo === this.order.outBizNo ? this.order : null;
  }
  countSuccessByWallet(): Promise<number> {
    throw new Error('not used');
  }
  paginateByWallet(): Promise<[WithdrawalOrderEntity[], number]> {
    throw new Error('not used');
  }
  paginate(): Promise<[WithdrawalOrderEntity[], number]> {
    throw new Error('not used');
  }
  listByStatus(): Promise<WithdrawalOrderEntity[]> {
    throw new Error('not used');
  }
  sumFrozenByWallet(): Promise<number> {
    throw new Error('not used');
  }
}

/** 可编程渠道端口：按脚本返回结果或抛错，记录入参 */
class FakePort implements PayoutPort {
  readonly available = true;
  readonly supportsCallback = true;
  transferInputs: PayoutInput[] = [];
  queryInputs: PayoutQueryInput[] = [];
  transferScript: () => Promise<PayoutResult> = async () =>
    result(PayoutExecutionStatus.Processing);
  queryScript: () => Promise<PayoutResult> = async () =>
    result(PayoutExecutionStatus.Processing);
  callbackScript: () => PayoutCallbackResult = () => ({
    ...result(PayoutExecutionStatus.Succeeded, { channelState: PayoutChannelState.Success }),
    outBizNo: 'W20260901000000000001',
    amountFen: 9_500,
  });
  constructor(readonly provider: PayoutProvider) {}

  transfer(input: PayoutInput): Promise<PayoutResult> {
    this.transferInputs.push(input);
    return this.transferScript();
  }
  queryTransfer(input: PayoutQueryInput): Promise<PayoutResult> {
    this.queryInputs.push(input);
    return this.queryScript();
  }
  async parseCallback(_req: PayoutCallbackRequest): Promise<PayoutCallbackResult> {
    return this.callbackScript();
  }
  callbackAck(): string {
    return 'SUCCESS';
  }
}

interface Harness {
  order: WithdrawalOrderEntity;
  ledger: FakeLedger;
  alipay: FakePort;
  wechat: FakePort;
  approve: ApproveWithdrawalUseCase;
  callback: HandleWithdrawalCallbackUseCase;
  sync: SyncWithdrawalUseCase;
}

function harness(overrides: Partial<WithdrawalOrderEntity> = {}): Harness {
  const order = makeOrder(overrides);
  const ledger = new FakeLedger(order);
  const repo = new FakeRepo(order);
  const alipay = new FakePort(PayoutProvider.JqfAlipay);
  const wechat = new FakePort(PayoutProvider.JqfWechat);
  const resolver = new PayoutResolver([alipay, wechat]);
  const settlement = new WithdrawalSettlementService(ledger);
  const config = {
    getString: async (_key: string, _fallback: string) => NOTIFY_BASE,
  } as unknown as ConfigService;
  return {
    order,
    ledger,
    alipay,
    wechat,
    approve: new ApproveWithdrawalUseCase(resolver, settlement, config, ledger, repo),
    callback: new HandleWithdrawalCallbackUseCase(resolver, settlement, repo),
    sync: new SyncWithdrawalUseCase(resolver, settlement, repo),
  };
}

const EMPTY_REQ: PayoutCallbackRequest = { body: {}, rawBody: '', headers: {} };

test('审核通过：pending → processing，按订单执行渠道转账到账金额并携带通知地址', async () => {
  const h = harness();
  const view = await h.approve.execute(h.order.id);
  assert.equal(view.status, WithdrawalStatus.Processing);
  assert.equal(h.order.status, WithdrawalStatus.Processing);
  assert.equal(h.alipay.transferInputs.length, 1);
  assert.equal(h.wechat.transferInputs.length, 0);
  assert.equal(h.alipay.transferInputs[0].amountFen, 9_500);
  assert.equal(
    h.alipay.transferInputs[0].notifyUrl,
    `${NOTIFY_BASE}/wallet/withdrawal/callback/${PayoutProvider.JqfAlipay}`,
  );
  assert.equal(h.order.providerOrderId, 'T-1');
  assert.equal(h.ledger.refunds, 0);
  await assert.rejects(h.approve.execute(h.order.id), BadRequestException);
  assert.equal(h.alipay.transferInputs.length, 1);
});

test('审核通过：渠道同步成功直接置 success；明确失败回滚；结果未知保持 processing 不回滚', async () => {
  const ok = harness();
  ok.alipay.transferScript = async () =>
    result(PayoutExecutionStatus.Succeeded, { channelState: PayoutChannelState.Success });
  assert.equal((await ok.approve.execute(ok.order.id)).status, WithdrawalStatus.Success);
  assert.equal(ok.ledger.successes, 1);

  const failed = harness();
  failed.alipay.transferScript = async () =>
    result(PayoutExecutionStatus.Failed, { failReason: '收款账户不存在' });
  const failedView = await failed.approve.execute(failed.order.id);
  assert.equal(failedView.status, WithdrawalStatus.Failed);
  assert.equal(failedView.failReason, '收款账户不存在');
  assert.equal(failed.ledger.refunds, 1);
  assert.equal(failed.order.channelOrderNo, 'CH-1');

  const unknown = harness();
  unknown.alipay.transferScript = async () => {
    throw new PayoutOutcomeUnknownError('网关超时');
  };
  const unknownView = await unknown.approve.execute(unknown.order.id);
  assert.equal(unknownView.status, WithdrawalStatus.Processing);
  assert.equal(unknown.order.status, WithdrawalStatus.Processing);
  assert.equal(unknown.ledger.refunds, 0);
});

test('转账通知：成功置 success 并回填渠道快照，重复通知幂等不重复累计', async () => {
  const h = harness({ status: WithdrawalStatus.Processing });
  assert.equal(await h.callback.execute(PayoutProvider.JqfAlipay, EMPTY_REQ), 'SUCCESS');
  assert.equal(h.order.status, WithdrawalStatus.Success);
  assert.equal(h.order.channelState, PayoutChannelState.Success);
  assert.equal(h.order.channelFeeFen, 15);
  assert.equal(await h.callback.execute(PayoutProvider.JqfAlipay, EMPTY_REQ), 'SUCCESS');
  assert.equal(h.ledger.successes, 1);
  assert.equal(h.ledger.refunds, 0);
});

test('转账通知：处理中仅刷新快照；失败回滚余额；成功后再收失败通知不再回滚', async () => {
  const h = harness({ status: WithdrawalStatus.Processing });
  h.alipay.callbackScript = () => ({
    ...result(PayoutExecutionStatus.Processing),
    outBizNo: h.order.outBizNo,
    amountFen: 9_500,
  });
  await h.callback.execute(PayoutProvider.JqfAlipay, EMPTY_REQ);
  assert.equal(h.order.status, WithdrawalStatus.Processing);
  assert.equal(h.ledger.syncs.length, 1);

  h.alipay.callbackScript = () => ({
    ...result(PayoutExecutionStatus.Failed, {
      channelState: PayoutChannelState.Failed,
      failReason: '计全付转账失败：余额不足',
    }),
    outBizNo: h.order.outBizNo,
    amountFen: 9_500,
  });
  await h.callback.execute(PayoutProvider.JqfAlipay, EMPTY_REQ);
  assert.equal(h.order.status, WithdrawalStatus.Failed);
  assert.equal(h.order.failReason, '计全付转账失败：余额不足');
  assert.equal(h.ledger.refunds, 1);

  const done = harness({ status: WithdrawalStatus.Success });
  done.alipay.callbackScript = h.alipay.callbackScript;
  await done.callback.execute(PayoutProvider.JqfAlipay, EMPTY_REQ);
  assert.equal(done.order.status, WithdrawalStatus.Success);
  assert.equal(done.ledger.refunds, 0);
});

test('转账通知：渠道与提现单执行渠道不一致、金额与到账额不符、单号不存在均拒绝且不动账', async () => {
  const h = harness({ status: WithdrawalStatus.Processing });
  h.wechat.callbackScript = h.alipay.callbackScript;
  await assert.rejects(h.callback.execute(PayoutProvider.JqfWechat, EMPTY_REQ), /渠道不匹配/);

  h.alipay.callbackScript = () => ({
    ...result(PayoutExecutionStatus.Succeeded),
    outBizNo: h.order.outBizNo,
    amountFen: 10_000,
  });
  await assert.rejects(h.callback.execute(PayoutProvider.JqfAlipay, EMPTY_REQ), /金额不符/);

  h.alipay.callbackScript = () => ({
    ...result(PayoutExecutionStatus.Succeeded),
    outBizNo: 'W-UNKNOWN',
    amountFen: 9_500,
  });
  await assert.rejects(h.callback.execute(PayoutProvider.JqfAlipay, EMPTY_REQ), /不存在/);
  assert.equal(h.order.status, WithdrawalStatus.Processing);
  assert.equal(h.ledger.successes, 0);
  assert.equal(h.ledger.refunds, 0);
});

test('主动查单：仅处理中可同步；成功/失败/处理中按结果推进；查询失败保持 processing', async () => {
  const pending = harness();
  await assert.rejects(pending.sync.execute(pending.order.id), BadRequestException);

  const h = harness({ status: WithdrawalStatus.Processing, providerOrderId: 'T-1' });
  h.alipay.queryScript = async () => {
    throw new PayoutOutcomeUnknownError('查询超时');
  };
  assert.equal((await h.sync.execute(h.order.id)).status, WithdrawalStatus.Processing);
  assert.deepEqual(h.alipay.queryInputs[0], { outBizNo: h.order.outBizNo, providerOrderId: 'T-1' });

  h.alipay.queryScript = async () =>
    result(PayoutExecutionStatus.Succeeded, { channelState: PayoutChannelState.Success });
  assert.equal((await h.sync.execute(h.order.id)).status, WithdrawalStatus.Success);
  assert.equal(h.ledger.successes, 1);

  const failed = harness({ status: WithdrawalStatus.Processing });
  failed.alipay.queryScript = async () =>
    result(PayoutExecutionStatus.Failed, { failReason: '渠道关单' });
  assert.equal((await failed.sync.execute(failed.order.id)).status, WithdrawalStatus.Failed);
  assert.equal(failed.ledger.refunds, 1);
});

test('主动查单：渠道无此单在宽限期内或已有渠道单号时保持 processing，超期且从未受理才回滚', async () => {
  const now = new Date();
  const fresh = makeOrder({ updatedAt: new Date(now.getTime() - 60_000) });
  assert.equal(canFailOnNotFound(fresh, now), false);
  const stale = makeOrder({
    updatedAt: new Date(now.getTime() - PAYOUT_NOT_FOUND_GRACE_MS - 1),
  });
  assert.equal(canFailOnNotFound(stale, now), true);
  assert.equal(canFailOnNotFound({ ...stale, providerOrderId: 'T-1' } as WithdrawalOrderEntity, now), false);

  const inGrace = harness({ status: WithdrawalStatus.Processing, updatedAt: new Date() });
  inGrace.alipay.queryScript = async () =>
    result(PayoutExecutionStatus.NotFound, { providerOrderId: '' });
  const inGraceView = await inGrace.sync.execute(inGrace.order.id);
  assert.equal(inGraceView.status, WithdrawalStatus.Processing);
  assert.equal(inGrace.ledger.refunds, 0);

  const expired = harness({
    status: WithdrawalStatus.Processing,
    updatedAt: new Date(Date.now() - PAYOUT_NOT_FOUND_GRACE_MS - 1),
  });
  expired.alipay.queryScript = inGrace.alipay.queryScript;
  const expiredView = await expired.sync.execute(expired.order.id);
  assert.equal(expiredView.status, WithdrawalStatus.Failed);
  assert.equal(expired.ledger.refunds, 1);
  assert.match(expired.order.failReason ?? '', /未出款/);
});
