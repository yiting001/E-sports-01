import assert from 'node:assert/strict';
import test from 'node:test';
import { AlipayRequestError } from 'alipay-sdk';
import type { AlipayClientFactory } from '../../src/modules/wallet/infrastructure/drivers/alipay-client.factory';
import { AlipayRefundDriver } from '../../src/modules/wallet/infrastructure/drivers/alipay-refund.driver';
import {
  RefundExecutionStatus,
  RefundOutcomeUnknownError,
  type RefundCreateInput,
} from '../../src/modules/wallet/domain/refund-port.interface';

interface AlipayCall {
  method: string;
  params: Record<string, unknown>;
  options: Record<string, unknown>;
}

const CREATE_INPUT: RefundCreateInput = {
  outTradeNo: 'ORDER-20260722-1',
  outRefundNo: 'REFUND-20260722-1',
  totalAmountFen: 12_345,
  refundAmountFen: 2_345,
  reason: '用户申请退款',
  notifyUrl: 'https://example.test/api/order/refund/callback/wechat',
};

test('支付宝退款按分转换金额并携带稳定退款单号', async () => {
  const calls: AlipayCall[] = [];
  const driver = createAlipayDriver(calls, [
    {
      code: '10000',
      outTradeNo: CREATE_INPUT.outTradeNo,
      refundFee: '23.45',
    },
  ]);

  const result = await driver.createRefund(CREATE_INPUT);

  assert.deepEqual(result, {
    status: RefundExecutionStatus.Succeeded,
    providerRefundNo: '',
    failReason: '',
  });
  assert.deepEqual(calls, [
    {
      method: 'alipay.trade.refund',
      params: {
        bizContent: {
          out_trade_no: CREATE_INPUT.outTradeNo,
          out_request_no: CREATE_INPUT.outRefundNo,
          refund_amount: '23.45',
          refund_reason: CREATE_INPUT.reason,
        },
      },
      options: { validateSign: true },
    },
  ]);
});

test('支付宝退款查询使用同一退款单号且稳定映射成功和不存在', async () => {
  const calls: AlipayCall[] = [];
  const driver = createAlipayDriver(calls, [
    {
      code: '10000',
      outTradeNo: CREATE_INPUT.outTradeNo,
      outRequestNo: CREATE_INPUT.outRefundNo,
      refundAmount: '23.45',
    },
    { code: '40004', subCode: 'ACQ.REFUND_NOT_EXIST', subMsg: '退款单不存在' },
  ]);
  const query = {
    outTradeNo: CREATE_INPUT.outTradeNo,
    outRefundNo: CREATE_INPUT.outRefundNo,
    totalAmountFen: CREATE_INPUT.totalAmountFen,
    refundAmountFen: CREATE_INPUT.refundAmountFen,
  };

  const first = await driver.queryRefund(query);
  const second = await driver.queryRefund(query);

  assert.equal(first.status, RefundExecutionStatus.Succeeded);
  assert.equal(second.status, RefundExecutionStatus.NotFound);
  assert.deepEqual(
    calls.map((call) => call.params),
    [
      {
        bizContent: {
          out_trade_no: query.outTradeNo,
          out_request_no: query.outRefundNo,
        },
      },
      {
        bizContent: {
          out_trade_no: query.outTradeNo,
          out_request_no: query.outRefundNo,
        },
      },
    ],
  );
  assert.ok(calls.every((call) => call.options.validateSign === true));
});

test('支付宝退款业务失败返回安全摘要，非法金额不请求渠道', async () => {
  const calls: AlipayCall[] = [];
  const driver = createAlipayDriver(calls, [
    { code: '40004', subCode: 'ACQ.REFUND_AMT_NOT_EQUAL_TOTAL', subMsg: '退款金额错误' },
  ]);

  const failed = await driver.createRefund(CREATE_INPUT);
  assert.equal(failed.status, RefundExecutionStatus.Failed);
  assert.equal(failed.providerRefundNo, '');
  assert.match(failed.failReason, /退款金额错误/);
  assert.doesNotMatch(failed.failReason, /ORDER-20260722/);

  await assert.rejects(
    driver.createRefund({
      ...CREATE_INPUT,
      refundAmountFen: CREATE_INPUT.totalAmountFen + 1,
    }),
    /退款金额不合法/,
  );
  assert.equal(calls.length, 1);
});

test('支付宝传输超时归类为渠道结果未知', async () => {
  const calls: AlipayCall[] = [];
  const cause = Object.assign(new Error('request timeout'), { code: 'ETIMEDOUT' });
  const requestError = new AlipayRequestError('HttpClient Request error: request timeout');
  Object.defineProperty(requestError, 'cause', { value: cause });
  const driver = createAlipayDriver(calls, [requestError]);

  await assert.rejects(driver.createRefund(CREATE_INPUT), RefundOutcomeUnknownError);
});

test('支付宝 429/5xx 即使携带 traceId 也保持渠道结果未知', async () => {
  for (const status of [429, 503]) {
    const error = new AlipayRequestError(`HTTP 请求错误, status: ${status}`, {
      traceId: `TRACE-${status}`,
    });
    const driver = createAlipayDriver([], [error]);
    await assert.rejects(driver.createRefund(CREATE_INPUT), RefundOutcomeUnknownError);
  }
});

test('支付宝系统类和未识别业务码不开放新退款尝试', async () => {
  for (const response of [
    { code: '20000', msg: '服务不可用' },
    { code: '40004', subCode: 'ACQ.SYSTEM_ERROR', subMsg: '系统错误' },
    { code: '40004', subCode: 'ACQ.UNKNOWN_ERROR', subMsg: '未知错误' },
  ]) {
    const driver = createAlipayDriver([], [response]);
    await assert.rejects(driver.createRefund(CREATE_INPUT), RefundOutcomeUnknownError);
  }
});

test('支付宝退款拒绝错订单、错退款单号或错金额的成功响应', async () => {
  const driver = createAlipayDriver(
    [],
    [
      { code: '10000', outTradeNo: 'OTHER-ORDER', refundFee: '23.45' },
      { code: '10000', outTradeNo: CREATE_INPUT.outTradeNo, refundFee: '99.99' },
      {
        code: '10000',
        outTradeNo: CREATE_INPUT.outTradeNo,
        outRequestNo: 'OTHER-REFUND',
        refundAmount: '23.45',
      },
      {
        code: '10000',
        outTradeNo: CREATE_INPUT.outTradeNo,
        outRequestNo: CREATE_INPUT.outRefundNo,
        refundAmount: '99.99',
      },
    ],
  );
  const query = {
    outTradeNo: CREATE_INPUT.outTradeNo,
    outRefundNo: CREATE_INPUT.outRefundNo,
    totalAmountFen: CREATE_INPUT.totalAmountFen,
    refundAmountFen: CREATE_INPUT.refundAmountFen,
  };

  await assert.rejects(driver.createRefund(CREATE_INPUT), /订单或金额不匹配/);
  await assert.rejects(driver.createRefund(CREATE_INPUT), /订单或金额不匹配/);
  await assert.rejects(driver.queryRefund(query), /订单、退款单号或金额不匹配/);
  await assert.rejects(driver.queryRefund(query), /订单、退款单号或金额不匹配/);
});

test('支付宝退款预检在创建渠道尝试前拒绝无效签名密钥', async () => {
  const factory = {
    create: async () => ({
      config: {
        privateKey: 'invalid-private-key',
        alipayPublicKey: 'invalid-public-key',
      },
    }),
  } as unknown as AlipayClientFactory;
  const driver = new AlipayRefundDriver(factory);

  await assert.rejects(driver.assertReady(), /支付宝退款签名或验签密钥格式无效/);
});

test('支付宝验签失败转换为不含渠道原文的安全异常', async () => {
  const leaked = `验签失败，服务端返回的 sign: 'SECRET-SIGN' 无效, validateStr: '${CREATE_INPUT.outTradeNo}/${CREATE_INPUT.outRefundNo}'`;
  const driver = createAlipayDriver([], [new AlipayRequestError(leaked)]);

  await assert.rejects(driver.createRefund(CREATE_INPUT), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, '支付宝退款响应验签失败');
    assert.doesNotMatch(error.message, /SECRET-SIGN|ORDER-|REFUND-/);
    return true;
  });
});

function createAlipayDriver(
  calls: AlipayCall[],
  responses: Array<Record<string, unknown> | Error>,
): AlipayRefundDriver {
  let responseIndex = 0;
  const factory = {
    create: async () => ({
      exec: async (
        method: string,
        params: Record<string, unknown>,
        options: Record<string, unknown> = {},
      ) => {
        calls.push({ method, params, options });
        const response = responses[responseIndex];
        responseIndex += 1;
        if (!response) {
          throw new Error('测试未配置支付宝响应');
        }
        if (response instanceof Error) {
          throw response;
        }
        return response;
      },
    }),
  } as unknown as AlipayClientFactory;
  return new AlipayRefundDriver(factory);
}
