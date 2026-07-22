import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test, { type TestContext } from 'node:test';
import type {
  WechatPayConfig,
  WechatPayConfigFactory,
} from '../../src/modules/wallet/infrastructure/drivers/wechat-pay.config';
import { WechatRefundDriver } from '../../src/modules/wallet/infrastructure/drivers/wechat-refund.driver';
import {
  RefundExecutionStatus,
  RefundOutcomeUnknownError,
  type RefundCreateInput,
} from '../../src/modules/wallet/domain/refund-port.interface';

const CREATE_INPUT: RefundCreateInput = {
  outTradeNo: 'ORDER-20260722-1',
  outRefundNo: 'REFUND-20260722-1',
  totalAmountFen: 12_345,
  refundAmountFen: 2_345,
  reason: '用户申请退款',
  notifyUrl: 'https://example.test/api/order/refund/callback/wechat',
};

test('微信退款创建发送国内退款请求并映射处理中状态', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [wechatRefundResponse('PROCESSING')]);
  const driver = createWechatDriver();

  const result = await driver.createRefund(CREATE_INPUT);

  assert.deepEqual(result, {
    status: RefundExecutionStatus.Processing,
    providerRefundNo: 'WECHAT-REFUND-1',
    failReason: '',
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.method, 'POST');
  assert.equal(requests[0]?.url, 'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds');
  assert.match(requests[0]?.authorization ?? '', /^WECHATPAY2-SHA256-RSA2048 /);
  assert.deepEqual(JSON.parse(requests[0]?.body ?? '') as unknown, {
    out_trade_no: CREATE_INPUT.outTradeNo,
    out_refund_no: CREATE_INPUT.outRefundNo,
    reason: CREATE_INPUT.reason,
    notify_url: CREATE_INPUT.notifyUrl,
    amount: {
      refund: CREATE_INPUT.refundAmountFen,
      total: CREATE_INPUT.totalAmountFen,
      currency: 'CNY',
    },
  });
});

test('微信退款查询映射成功、失败和不存在', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [
    wechatRefundResponse('SUCCESS'),
    wechatRefundResponse('CLOSED'),
    signedWechatResponse({ code: 'RESOURCE_NOT_EXISTS', message: '退款单不存在' }, { status: 404 }),
  ]);
  const driver = createWechatDriver();
  const query = {
    outTradeNo: CREATE_INPUT.outTradeNo,
    outRefundNo: CREATE_INPUT.outRefundNo,
    totalAmountFen: CREATE_INPUT.totalAmountFen,
    refundAmountFen: CREATE_INPUT.refundAmountFen,
  };

  const succeeded = await driver.queryRefund(query);
  const failed = await driver.queryRefund(query);
  const notFound = await driver.queryRefund(query);

  assert.equal(succeeded.status, RefundExecutionStatus.Succeeded);
  assert.equal(failed.status, RefundExecutionStatus.Failed);
  assert.equal(failed.providerRefundNo, 'WECHAT-REFUND-1');
  assert.match(failed.failReason, /已关闭/);
  assert.equal(notFound.status, RefundExecutionStatus.NotFound);
  assert.deepEqual(
    requests.map((request) => request.url),
    Array.from(
      { length: 3 },
      () => `https://api.mch.weixin.qq.com/v3/refund/domestic/refunds/${CREATE_INPUT.outRefundNo}`,
    ),
  );
  assert.ok(requests.every((request) => request.method === 'GET' && request.body === ''));
});

test('微信重复退款单号冲突后查询原单，不创建第二个退款单号', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [
    signedWechatResponse(
      { code: 'RESOURCE_ALREADY_EXISTS', message: '退款单已存在' },
      { status: 409 },
    ),
    wechatRefundResponse('SUCCESS'),
  ]);
  const driver = createWechatDriver();

  const result = await driver.createRefund(CREATE_INPUT);

  assert.equal(result.status, RefundExecutionStatus.Succeeded);
  assert.deepEqual(
    requests.map((request) => request.method),
    ['POST', 'GET'],
  );
  assert.match(requests[1]?.url ?? '', new RegExp(`${CREATE_INPUT.outRefundNo}$`));
});

test('微信退款拒绝非法金额且渠道故障不伪报失败终态', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [
    signedWechatResponse({ code: 'SYSTEM_ERROR', message: '系统繁忙' }, { status: 503 }),
  ]);
  const driver = createWechatDriver();

  await assert.rejects(
    driver.createRefund({ ...CREATE_INPUT, refundAmountFen: 0 }),
    /退款金额不合法/,
  );
  assert.equal(requests.length, 0);
  await assert.rejects(driver.createRefund(CREATE_INPUT), /微信退款服务暂不可用/);
  assert.equal(requests.length, 1);
});

test('微信未知业务错误和未知退款状态保持结果未知，明确参数错误才失败', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [
    signedWechatResponse({ code: 'SYSTEM_ERROR', message: '系统错误' }, { status: 400 }),
    signedWechatResponse({ code: 'NEW_ERROR', message: '未知错误' }, { status: 400 }),
    wechatRefundResponse('NEW_STATUS'),
    signedWechatResponse({ code: 'PARAM_ERROR', message: '参数错误' }, { status: 400 }),
  ]);
  const driver = createWechatDriver();

  await assert.rejects(driver.createRefund(CREATE_INPUT), RefundOutcomeUnknownError);
  await assert.rejects(driver.createRefund(CREATE_INPUT), RefundOutcomeUnknownError);
  await assert.rejects(driver.createRefund(CREATE_INPUT), RefundOutcomeUnknownError);
  assert.equal((await driver.createRefund(CREATE_INPUT)).status, RefundExecutionStatus.Failed);
});

test('微信退款拒绝错订单、错退款单号或错金额的已验签响应', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [
    signedWechatResponse(wechatRefundPayload('SUCCESS', { out_trade_no: 'OTHER-ORDER' })),
    signedWechatResponse(wechatRefundPayload('SUCCESS', { out_refund_no: 'OTHER-REFUND' })),
    signedWechatResponse(
      wechatRefundPayload('SUCCESS', {
        amount: {
          total: CREATE_INPUT.totalAmountFen,
          refund: CREATE_INPUT.refundAmountFen + 1,
          currency: 'CNY',
        },
      }),
    ),
  ]);
  const driver = createWechatDriver();

  await assert.rejects(driver.createRefund(CREATE_INPUT), /订单、退款单号或金额不匹配/);
  await assert.rejects(driver.createRefund(CREATE_INPUT), /订单、退款单号或金额不匹配/);
  await assert.rejects(driver.createRefund(CREATE_INPUT), /订单、退款单号或金额不匹配/);
});

test('微信退款响应缺少平台验签材料时安全失败', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [wechatRefundResponse('PROCESSING')]);
  const driver = createWechatDriver({
    ...TEST_WECHAT_CONFIG,
    platformPublicKey: '',
    platformSerial: '',
  });

  await assert.rejects(driver.createRefund(CREATE_INPUT), /平台证书未配置/);
  assert.equal(requests.length, 0);
});

test('微信退款预检拒绝无效商户私钥且不发出资金请求', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [wechatRefundResponse('PROCESSING')]);
  const driver = createWechatDriver({
    ...TEST_WECHAT_CONFIG,
    privateKey: 'invalid-private-key',
  });

  await assert.rejects(driver.assertReady(), /微信支付退款签名或验签密钥格式无效/);
  assert.equal(requests.length, 0);
});

test('微信退款响应签名或平台证书序列号不可信时拒绝解析', async (t) => {
  const requests: CapturedRequest[] = [];
  installFetch(t, requests, [
    signedWechatResponse(
      {
        refund_id: 'WECHAT-REFUND-1',
        out_refund_no: CREATE_INPUT.outRefundNo,
        status: 'SUCCESS',
      },
      { signedBody: '{}' },
    ),
    signedWechatResponse(
      {
        refund_id: 'WECHAT-REFUND-1',
        out_refund_no: CREATE_INPUT.outRefundNo,
        status: 'SUCCESS',
      },
      { serial: 'UNTRUSTED-SERIAL' },
    ),
  ]);
  const driver = createWechatDriver();

  await assert.rejects(driver.createRefund(CREATE_INPUT), /微信退款响应验签失败/);
  await assert.rejects(driver.createRefund(CREATE_INPUT), /平台证书序列号不匹配/);
});

const TEST_WECHAT_KEYS = createWechatKeys();
const TEST_WECHAT_CONFIG = createWechatConfig();

function createWechatKeys(): {
  merchantPrivateKey: string;
  platformPrivateKey: string;
  platformPublicKey: string;
} {
  const merchant = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const platform = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    merchantPrivateKey: merchant.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    platformPrivateKey: platform.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    platformPublicKey: platform.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

function createWechatConfig(): WechatPayConfig {
  return {
    appId: 'wx-test-app',
    mchId: '1900000109',
    serial: '7777777777777777777777777777777777777777',
    privateKey: TEST_WECHAT_KEYS.merchantPrivateKey,
    apiV3Key: '0123456789abcdef0123456789abcdef',
    platformPublicKey: TEST_WECHAT_KEYS.platformPublicKey,
    platformSerial: 'PLATFORM-SERIAL-1',
  };
}

function createWechatDriver(config: WechatPayConfig = TEST_WECHAT_CONFIG): WechatRefundDriver {
  const factory = {
    load: async () => config,
  } as WechatPayConfigFactory;
  return new WechatRefundDriver(factory);
}

interface CapturedRequest {
  url: string;
  method: string;
  authorization: string;
  body: string;
}

function installFetch(t: TestContext, requests: CapturedRequest[], responses: Response[]): void {
  const originalFetch = globalThis.fetch;
  let responseIndex = 0;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: requestUrl(input),
      method: init?.method ?? 'GET',
      authorization: readHeader(init?.headers, 'Authorization'),
      body: typeof init?.body === 'string' ? init.body : '',
    });
    const response = responses[responseIndex];
    responseIndex += 1;
    if (!response) {
      throw new Error('测试未配置微信响应');
    }
    return response;
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
}

function requestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.toString() : input.url;
}

function readHeader(headers: HeadersInit | undefined, name: string): string {
  return new Headers(headers).get(name) ?? '';
}

function wechatRefundResponse(status: string): Response {
  return signedWechatResponse(wechatRefundPayload(status));
}

function wechatRefundPayload(
  status: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    refund_id: 'WECHAT-REFUND-1',
    out_trade_no: CREATE_INPUT.outTradeNo,
    out_refund_no: CREATE_INPUT.outRefundNo,
    status,
    amount: {
      total: CREATE_INPUT.totalAmountFen,
      refund: CREATE_INPUT.refundAmountFen,
      currency: 'CNY',
    },
    ...overrides,
  };
}

function signedWechatResponse(
  value: Record<string, unknown>,
  options: { status?: number; serial?: string; signedBody?: string } = {},
): Response {
  const body = JSON.stringify(value);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = 'wechat-response-test-nonce';
  const message = `${timestamp}\n${nonce}\n${options.signedBody ?? body}\n`;
  const signature = sign('RSA-SHA256', Buffer.from(message), TEST_WECHAT_KEYS.platformPrivateKey);
  return new Response(body, {
    status: options.status ?? 200,
    headers: {
      'Wechatpay-Timestamp': timestamp,
      'Wechatpay-Nonce': nonce,
      'Wechatpay-Signature': signature.toString('base64'),
      'Wechatpay-Serial': options.serial ?? TEST_WECHAT_CONFIG.platformSerial,
    },
  });
}
