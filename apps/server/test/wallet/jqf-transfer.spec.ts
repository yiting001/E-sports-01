import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { JqfTransferIfCode, PayoutChannelState, PayoutProvider } from '@app/contracts';
import {
  PayoutExecutionStatus,
  PayoutInput,
  PayoutOutcomeUnknownError,
} from '../../src/modules/wallet/domain/payout-port.interface';
import type {
  JqfPayConfig,
  JqfPayConfigFactory,
} from '../../src/modules/wallet/infrastructure/drivers/jqf-pay.config';
import { signJqfParams } from '../../src/modules/wallet/infrastructure/drivers/jqf-pay.request';
import {
  JqfAlipayTransferDriver,
  JqfBankCardTransferDriver,
  JqfWechatTransferDriver,
  parseJqfTransferCallback,
} from '../../src/modules/wallet/infrastructure/drivers/jqf-transfer.driver';

const API_KEY = 'transfer-test-key';

const CFG: JqfPayConfig = {
  apiBase: 'https://pay.example.test',
  mchNo: 'M1621873433',
  appId: '60cc31c25b327517d2246a51',
  apiKey: API_KEY,
  transferIfCode: JqfTransferIfCode.AliAqfPay,
};

const configFactory = { load: async () => CFG } as unknown as JqfPayConfigFactory;

function factoryOf(cfg: JqfPayConfig): JqfPayConfigFactory {
  return { load: async () => cfg } as unknown as JqfPayConfigFactory;
}

/** 支付宝 / 微信零钱提现单的转账入参（无银行卡要素） */
function payoutInput(overrides: Partial<PayoutInput> = {}): PayoutInput {
  return {
    outBizNo: 'W1',
    amountFen: 100,
    account: 'a@b.com',
    accountName: '张三',
    idCardNo: null,
    bankName: null,
    phone: null,
    remark: '钱包提现',
    notifyUrl: '',
    ...overrides,
  };
}

/** 银行卡提现单的转账入参 */
function bankCardInput(overrides: Partial<PayoutInput> = {}): PayoutInput {
  return payoutInput({
    outBizNo: 'WB1',
    amountFen: 9500,
    account: '6214850116825113',
    accountName: '丁志伟',
    idCardNo: '11010119900101003X',
    bankName: '招商银行',
    phone: '18611727423',
    notifyUrl: 'https://api.example.test/wallet/withdrawal/callback/jqf_bank_card',
    ...overrides,
  });
}

/** 构造带商户身份与合法签名的转账通知体（字段全部为表单字符串） */
function signedNotify(fields: Record<string, string>): Record<string, unknown> {
  const body = { mchNo: CFG.mchNo, appId: CFG.appId, ...fields };
  return { ...body, sign: signJqfParams(body, API_KEY) };
}

/** 用假 fetch 运行一段逻辑，记录请求并按队列返回响应 */
async function withFetch<T>(
  responses: Array<{ status?: number; body: unknown } | Error>,
  run: (calls: Array<{ url: string; payload: Record<string, unknown> }>) => Promise<T>,
): Promise<T> {
  const calls: Array<{ url: string; payload: Record<string, unknown> }> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      payload: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
    });
    const next = responses.shift();
    if (next === undefined) {
      throw new Error('未预期的请求');
    }
    if (next instanceof Error) {
      throw next;
    }
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

test('转账通知：状态 0/1 映射处理中、2 成功、3/4 失败，手续费为两项之和', () => {
  const base = {
    mchOrderNo: 'W20260901000000000001',
    transferId: 'T202609010001',
    amount: '9500',
    channelOrderNo: 'CH-1',
    mchOrderFeeAmount: '10',
    mchApicostFeeAmount: '5',
  };
  const expectations: Array<[string, PayoutExecutionStatus, PayoutChannelState]> = [
    ['0', PayoutExecutionStatus.Processing, PayoutChannelState.Created],
    ['1', PayoutExecutionStatus.Processing, PayoutChannelState.Processing],
    ['2', PayoutExecutionStatus.Succeeded, PayoutChannelState.Success],
    ['3', PayoutExecutionStatus.Failed, PayoutChannelState.Failed],
    ['4', PayoutExecutionStatus.Failed, PayoutChannelState.Closed],
  ];
  for (const [state, status, channelState] of expectations) {
    const result = parseJqfTransferCallback(CFG, {
      body: signedNotify({ ...base, state, errMsg: state === '3' ? '余额不足' : '' }),
      rawBody: '',
      headers: {},
    });
    assert.equal(result.status, status, `state=${state}`);
    assert.equal(result.channelState, channelState);
    assert.equal(result.outBizNo, base.mchOrderNo);
    assert.equal(result.amountFen, 9500);
    assert.equal(result.providerOrderId, base.transferId);
    assert.equal(result.channelOrderNo, 'CH-1');
    assert.equal(result.channelFeeFen, 15);
  }
  const failed = parseJqfTransferCallback(CFG, {
    body: signedNotify({ ...base, state: '3', errMsg: '余额不足' }),
    rawBody: '',
    headers: {},
  });
  assert.equal(failed.failReason, '计全付转账失败：余额不足');
  assert.equal(failed.channelErrMsg, '余额不足');
});

test('转账通知：验签失败、商户身份不符、参数缺失均拒绝', () => {
  const body = signedNotify({
    mchOrderNo: 'W20260901000000000001',
    transferId: 'T202609010001',
    amount: '9500',
    state: '2',
  });
  assert.throws(
    () =>
      parseJqfTransferCallback(CFG, { body: { ...body, amount: '1' }, rawBody: '', headers: {} }),
    BadRequestException,
  );
  assert.throws(
    () => parseJqfTransferCallback({ ...CFG, mchNo: 'OTHER' }, { body, rawBody: '', headers: {} }),
    BadRequestException,
  );
  const missing = signedNotify({ transferId: 'T1', amount: '9500', state: '2' });
  assert.throws(
    () => parseJqfTransferCallback(CFG, { body: missing, rawBody: '', headers: {} }),
    BadRequestException,
  );
  const badState = signedNotify({
    mchOrderNo: 'W1',
    transferId: 'T1',
    amount: '9500',
    state: '9',
  });
  assert.throws(
    () => parseJqfTransferCallback(CFG, { body: badState, rawBody: '', headers: {} }),
    BadRequestException,
  );
});

test('发起转账：按渠道上送 ifCode/entryType 与通知地址，受理中返回 Processing', async () => {
  const driver = new JqfWechatTransferDriver(configFactory);
  assert.equal(driver.provider, PayoutProvider.JqfWechat);
  await withFetch(
    [{ body: { code: 0, data: { transferId: 'T-1', state: 1, mchOrderNo: 'W1' } } }],
    async (calls) => {
      const result = await driver.transfer(
        payoutInput({
          amountFen: 9500,
          account: 'openid-abc',
          notifyUrl: 'https://api.example.test/wallet/withdrawal/callback/jqf_wechat',
        }),
      );
      assert.equal(result.status, PayoutExecutionStatus.Processing);
      assert.equal(result.providerOrderId, 'T-1');
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, `${CFG.apiBase}/api/transferOrder`);
      assert.equal(calls[0].payload.ifCode, 'wxpay');
      assert.equal(calls[0].payload.entryType, 'WX_CASH');
      assert.equal(calls[0].payload.accountNo, 'openid-abc');
      assert.equal(calls[0].payload.amount, 9500);
      assert.equal(
        calls[0].payload.notifyUrl,
        'https://api.example.test/wallet/withdrawal/callback/jqf_wechat',
      );
      assert.equal(typeof calls[0].payload.sign, 'string');
      assert.equal('bankName' in calls[0].payload, false);
      assert.equal('channelExtra' in calls[0].payload, false);
    },
  );
});

test('银行卡转账：entryType=BANK_CARD，ifCode 取配置，上送卡号/姓名/开户行；支付宝安全发不附加 channelExtra', async () => {
  const driver = new JqfBankCardTransferDriver(configFactory);
  assert.equal(driver.provider, PayoutProvider.JqfBankCard);
  await withFetch(
    [{ body: { code: 0, data: { transferId: 'T-B1', state: 1, mchOrderNo: 'WB1' } } }],
    async (calls) => {
      const result = await driver.transfer(bankCardInput());
      assert.equal(result.status, PayoutExecutionStatus.Processing);
      assert.equal(result.providerOrderId, 'T-B1');
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, `${CFG.apiBase}/api/transferOrder`);
      assert.equal(calls[0].payload.ifCode, 'aliaqfpay');
      assert.equal(calls[0].payload.entryType, 'BANK_CARD');
      assert.equal(calls[0].payload.accountNo, '6214850116825113');
      assert.equal(calls[0].payload.accountName, '丁志伟');
      assert.equal(calls[0].payload.bankName, '招商银行');
      assert.equal(calls[0].payload.amount, 9500);
      assert.equal(
        calls[0].payload.notifyUrl,
        'https://api.example.test/wallet/withdrawal/callback/jqf_bank_card',
      );
      assert.equal('channelExtra' in calls[0].payload, false);
      assert.equal(typeof calls[0].payload.sign, 'string');
    },
  );
});

test('银行卡转账：易宝接口以 channelExtra JSON 上送身份证号与手机号，缺失时发起前拒绝', async () => {
  const driver = new JqfBankCardTransferDriver(
    factoryOf({ ...CFG, transferIfCode: JqfTransferIfCode.YeePay }),
  );
  await withFetch(
    [{ body: { code: 0, data: { transferId: 'T-B2', state: 0 } } }],
    async (calls) => {
      await driver.transfer(bankCardInput());
      assert.equal(calls[0].payload.ifCode, 'yeepay');
      assert.equal(calls[0].payload.entryType, 'BANK_CARD');
      assert.deepEqual(JSON.parse(String(calls[0].payload.channelExtra)), {
        idCardNo: '11010119900101003X',
        phoneNumber: '18611727423',
      });
    },
  );
  await withFetch([], async (calls) => {
    await assert.rejects(driver.transfer(bankCardInput({ phone: null })), BadRequestException);
    await assert.rejects(driver.transfer(bankCardInput({ idCardNo: null })), BadRequestException);
    assert.equal(calls.length, 0);
  });
});

test('发起转账：网关不可达抛结果未知，不得判定失败', async () => {
  const driver = new JqfAlipayTransferDriver(configFactory);
  await withFetch([new Error('ECONNRESET')], async () => {
    await assert.rejects(
      driver.transfer(payoutInput({ outBizNo: 'W2' })),
      PayoutOutcomeUnknownError,
    );
  });
});

test('发起转账：业务拒绝时先查单，渠道确实无此单才判定失败；已存在则以查询为准', async () => {
  const driver = new JqfAlipayTransferDriver(configFactory);
  await withFetch(
    [
      { body: { code: 1, msg: '账户余额不足' } },
      { body: { code: 1, msg: '转账订单不存在' } },
    ],
    async (calls) => {
      const result = await driver.transfer(payoutInput({ outBizNo: 'W3' }));
      assert.equal(result.status, PayoutExecutionStatus.Failed);
      assert.match(result.failReason, /账户余额不足/);
      assert.equal(calls[1].url, `${CFG.apiBase}/api/transfer/query`);
      assert.equal(calls[1].payload.mchOrderNo, 'W3');
    },
  );
  await withFetch(
    [
      { body: { code: 1, msg: '商户订单号重复' } },
      { body: { code: 0, data: { transferId: 'T-3', state: 2, mchOrderFeeAmount: '20' } } },
    ],
    async () => {
      const result = await driver.transfer(payoutInput({ outBizNo: 'W3' }));
      assert.equal(result.status, PayoutExecutionStatus.Succeeded);
      assert.equal(result.providerOrderId, 'T-3');
      assert.equal(result.channelFeeFen, 20);
    },
  );
});

test('转账查询：无此单返回 NotFound，查询失败抛结果未知，其余按状态映射', async () => {
  const driver = new JqfAlipayTransferDriver(configFactory);
  await withFetch([{ body: { code: 1, msg: '转账订单不存在' } }], async () => {
    const result = await driver.queryTransfer({ outBizNo: 'W4', providerOrderId: null });
    assert.equal(result.status, PayoutExecutionStatus.NotFound);
  });
  await withFetch([new Error('timeout')], async () => {
    await assert.rejects(
      driver.queryTransfer({ outBizNo: 'W4', providerOrderId: null }),
      PayoutOutcomeUnknownError,
    );
  });
  await withFetch(
    [{ body: { code: 0, data: { transferId: 'T-4', state: '4', errMsg: '渠道关单' } } }],
    async () => {
      const result = await driver.queryTransfer({ outBizNo: 'W4', providerOrderId: 'T-4' });
      assert.equal(result.status, PayoutExecutionStatus.Failed);
      assert.equal(result.channelState, PayoutChannelState.Closed);
      assert.equal(result.failReason, '计全付转账已关闭：渠道关单');
    },
  );
});
