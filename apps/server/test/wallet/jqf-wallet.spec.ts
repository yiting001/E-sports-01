import assert from 'node:assert/strict';
import test from 'node:test';
import { JqfWalletService } from '../../src/modules/wallet/application/jqf-wallet.service';
import {
  JQF_WALLET_CHANNEL_STATE,
  JqfWalletAccountEntity,
} from '../../src/modules/wallet/domain/jqf-wallet-account.entity';
import type { JqfWalletAccountRepository } from '../../src/modules/wallet/domain/jqf-wallet-account-repository.interface';
import type {
  JqfWalletOpenPort,
  JqfWalletOpenRequest,
  JqfWalletOpenResult,
} from '../../src/modules/wallet/domain/jqf-wallet-open-port.interface';

class FakeRepo implements JqfWalletAccountRepository {
  records = new Map<string, JqfWalletAccountEntity>();

  async findByUser(userId: string): Promise<JqfWalletAccountEntity | null> {
    return this.records.get(userId) ?? null;
  }

  async save(record: JqfWalletAccountEntity): Promise<JqfWalletAccountEntity> {
    this.records.set(record.userId, record);
    return record;
  }
}

class FakeChannel implements JqfWalletOpenPort {
  configured = true;
  openCalls: JqfWalletOpenRequest[] = [];
  result: JqfWalletOpenResult = {
    walletId: '2024102414555816',
    channelState: JQF_WALLET_CHANNEL_STATE.opened,
    errMsg: '',
  };
  error: Error | null = null;

  async isConfigured(): Promise<boolean> {
    return this.configured;
  }

  async openWallet(request: JqfWalletOpenRequest): Promise<JqfWalletOpenResult> {
    this.openCalls.push(request);
    if (this.error) {
      throw this.error;
    }
    return this.result;
  }

  async queryWallet(): Promise<JqfWalletOpenResult> {
    return this.result;
  }
}

const INPUT = {
  userId: 'u-1',
  realName: '张三',
  idCardNo: '110101199003070000',
  phone: '13800000000',
};

function build(): { service: JqfWalletService; repo: FakeRepo; channel: FakeChannel } {
  const repo = new FakeRepo();
  const channel = new FakeChannel();
  return { service: new JqfWalletService(repo, channel), repo, channel };
}

test('实名审核通过后开户成功：落库 walletId 与渠道状态，幂等单号带前缀', async () => {
  const { service, repo, channel } = build();
  await service.openForUser(INPUT);
  const record = repo.records.get('u-1');
  assert.ok(record);
  assert.equal(record.walletId, '2024102414555816');
  assert.equal(record.channelState, JQF_WALLET_CHANNEL_STATE.opened);
  assert.equal(record.errMsg, '');
  assert.ok(record.mchOrderNo.startsWith('JQFW'));
  assert.ok(record.syncedAt instanceof Date);
  assert.equal(channel.openCalls.length, 1);
  assert.equal(channel.openCalls[0].idcardName, '张三');
});

test('已开户/待审核/待激活状态不重复发起开户', async () => {
  for (const state of [
    JQF_WALLET_CHANNEL_STATE.opened,
    JQF_WALLET_CHANNEL_STATE.pending,
    JQF_WALLET_CHANNEL_STATE.inactive,
  ]) {
    const { service, repo, channel } = build();
    const existing = new JqfWalletAccountEntity();
    existing.userId = 'u-1';
    existing.mchOrderNo = 'JQFW-EXIST';
    existing.channelState = state;
    repo.records.set('u-1', existing);

    await service.openForUser(INPUT);
    assert.equal(channel.openCalls.length, 0);
  }
});

test('失败记录重试时复用原幂等单号', async () => {
  const { service, repo, channel } = build();
  const existing = new JqfWalletAccountEntity();
  existing.userId = 'u-1';
  existing.mchOrderNo = 'JQFW-RETRY';
  existing.channelState = JQF_WALLET_CHANNEL_STATE.failed;
  existing.errMsg = '渠道开户失败';
  repo.records.set('u-1', existing);

  await service.openForUser(INPUT);
  assert.equal(channel.openCalls.length, 1);
  assert.equal(channel.openCalls[0].mchOrderNo, 'JQFW-RETRY');
  assert.equal(repo.records.get('u-1')?.channelState, JQF_WALLET_CHANNEL_STATE.opened);
});

test('计全付未配置时静默跳过，不落开户记录', async () => {
  const { service, repo, channel } = build();
  channel.configured = false;
  await service.openForUser(INPUT);
  assert.equal(channel.openCalls.length, 0);
  assert.equal(repo.records.size, 0);
});

test('渠道调用异常只记录失败原因，不向调用方抛错', async () => {
  const { service, repo, channel } = build();
  channel.error = new Error('渠道网络超时');
  await service.openForUser(INPUT);
  const record = repo.records.get('u-1');
  assert.ok(record);
  assert.equal(record.channelState, JQF_WALLET_CHANNEL_STATE.notOpened);
  assert.equal(record.errMsg, '渠道网络超时');
});

test('用户未绑定手机号时记录原因且不调用渠道', async () => {
  const { service, repo, channel } = build();
  await service.openForUser({ ...INPUT, phone: '' });
  assert.equal(channel.openCalls.length, 0);
  assert.equal(repo.records.get('u-1')?.errMsg, '用户未绑定手机号，无法开户');
});
