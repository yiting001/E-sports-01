import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { CONFIG_KEYS, PaymentGateway, PaymentProvider } from '@app/contracts';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import { PaymentGatewayService } from '../../src/modules/wallet/application/payment-gateway.service';
import type { JqfPayConfig } from '../../src/modules/wallet/infrastructure/drivers/jqf-pay.config';
import {
  jqfReqTime,
  signJqfParams,
  verifyJqfSign,
} from '../../src/modules/wallet/infrastructure/drivers/jqf-pay.request';
import {
  jqfCallbackAck,
  parseJqfCallback,
} from '../../src/modules/wallet/infrastructure/drivers/jqf-pay.trade';

const API_KEY = 'test-api-key';

const CFG: JqfPayConfig = {
  apiBase: 'https://pay.example.test',
  mchNo: 'M1621873433',
  appId: '60cc31c25b327517d2246a51',
  apiKey: API_KEY,
};

function md5Upper(source: string): string {
  return createHash('md5').update(source, 'utf8').digest('hex').toUpperCase();
}

/** 构造带商户身份与合法签名的计全付异步通知体 */
function signedCallback(fields: Record<string, string | number>): Record<string, unknown> {
  const body = { mchNo: CFG.mchNo, appId: CFG.appId, ...fields };
  return { ...body, sign: signJqfParams(body, API_KEY) };
}

test('计全付签名按 key 字典序拼接并过滤空值与 sign 字段', () => {
  const sign = signJqfParams(
    { b: '2', a: '1', empty: '', missing: undefined, sign: 'SHOULD-IGNORE', amount: 100 },
    API_KEY,
  );
  assert.equal(sign, md5Upper(`a=1&amount=100&b=2&key=${API_KEY}`));
});

test('计全付验签接受合法签名并拒绝被篡改的通知', () => {
  const body: Record<string, unknown> = {
    mchOrderNo: 'R20260722000000123456',
    payOrderId: 'P202607220001',
    state: 2,
    amount: 500,
  };
  const signed = { ...body, sign: signJqfParams(body as Record<string, string | number>, API_KEY) };
  assert.equal(verifyJqfSign(signed, API_KEY), true);
  assert.equal(verifyJqfSign({ ...signed, amount: 99_999 }, API_KEY), false);
  assert.equal(verifyJqfSign({ ...body }, API_KEY), false);
});

test('计全付回调验签通过后映射支付结果，验签失败直接拒绝', () => {
  const signed = signedCallback({
    mchOrderNo: 'R20260722000000123456',
    payOrderId: 'P202607220001',
    state: 2,
    amount: 500,
    mchFeeAmount: 3,
  });

  const result = parseJqfCallback(CFG, { body: signed, rawBody: '', headers: {} });
  assert.deepEqual(result, {
    outTradeNo: 'R20260722000000123456',
    providerTradeNo: 'P202607220001',
    paidAmountFen: 500,
    success: true,
    channelFeeFen: 3,
  });
  assert.equal(jqfCallbackAck(), 'SUCCESS');

  assert.throws(
    () => parseJqfCallback(CFG, { body: { ...signed, state: 1 }, rawBody: '', headers: {} }),
    BadRequestException,
  );
});

test('计全付回调未支付状态不计入实付金额', () => {
  const signed = signedCallback({
    mchOrderNo: 'R20260722000000123456',
    payOrderId: 'P202607220001',
    state: 1,
    amount: 500,
  });
  const result = parseJqfCallback(CFG, { body: signed, rawBody: '', headers: {} });
  assert.equal(result.success, false);
  assert.equal(result.paidAmountFen, 0);
});

test('计全付表单回调中的字符串数值按整数解析并确认支付成功', () => {
  const signed = signedCallback({
    mchOrderNo: 'R20260722000000123456',
    payOrderId: 'P202607220001',
    state: '2',
    amount: '500',
  });
  const result = parseJqfCallback(CFG, { body: signed, rawBody: '', headers: {} });
  assert.deepEqual(result, {
    outTradeNo: 'R20260722000000123456',
    providerTradeNo: 'P202607220001',
    paidAmountFen: 500,
    success: true,
    channelFeeFen: null,
  });
});

test('计全付回调非整数状态或金额视为参数异常', () => {
  const badState = signedCallback({
    mchOrderNo: 'R20260722000000123456',
    payOrderId: 'P202607220001',
    state: 'paid',
    amount: '500',
  });
  assert.throws(
    () => parseJqfCallback(CFG, { body: badState, rawBody: '', headers: {} }),
    BadRequestException,
  );
  const badAmount = signedCallback({
    mchOrderNo: 'R20260722000000123456',
    payOrderId: 'P202607220001',
    state: '2',
    amount: '5.00',
  });
  assert.throws(
    () => parseJqfCallback(CFG, { body: badAmount, rawBody: '', headers: {} }),
    BadRequestException,
  );
});

test('计全付回调商户号或 appId 与本地配置不一致时拒绝', () => {
  const fields = {
    mchOrderNo: 'R20260722000000123456',
    payOrderId: 'P202607220001',
    state: '2',
    amount: '500',
  };
  const otherMch = { mchNo: 'M0000000000', appId: CFG.appId, ...fields };
  assert.throws(
    () =>
      parseJqfCallback(CFG, {
        body: { ...otherMch, sign: signJqfParams(otherMch, API_KEY) },
        rawBody: '',
        headers: {},
      }),
    /商户号或 appId 不匹配/,
  );
  const otherApp = { mchNo: CFG.mchNo, appId: 'other-app', ...fields };
  assert.throws(
    () =>
      parseJqfCallback(CFG, {
        body: { ...otherApp, sign: signJqfParams(otherApp, API_KEY) },
        rawBody: '',
        headers: {},
      }),
    /商户号或 appId 不匹配/,
  );
});

test('计全付请求时间戳为 13 位毫秒时间戳', () => {
  assert.equal(jqfReqTime(new Date('2026-07-22T00:01:02.000Z')), '1784678462000');
  assert.match(jqfReqTime(), /^\d{13}$/);
});

function gatewayWith(wechatGateway: string): PaymentGatewayService {
  const config = {
    getString: async (key: string, fallback: string) =>
      key === CONFIG_KEYS.wallet.paymentWechatGateway ? wechatGateway : fallback,
  } as unknown as ConfigService;
  return new PaymentGatewayService(config);
}

test('支付网关开启计全付时微信渠道切换为计全驱动，支付宝保持官方', async () => {
  const gateway = gatewayWith(PaymentGateway.Jqf);
  assert.equal(
    await gateway.resolvePaymentProvider(PaymentProvider.Wechat),
    PaymentProvider.JqfWechat,
  );
  assert.equal(
    await gateway.resolvePaymentProvider(PaymentProvider.WechatJsapi),
    PaymentProvider.JqfWechatJsapi,
  );
  assert.equal(
    await gateway.resolvePaymentProvider(PaymentProvider.Alipay),
    PaymentProvider.Alipay,
  );
  assert.equal(
    await gateway.resolveRefundProvider(PaymentProvider.Wechat),
    PaymentProvider.JqfWechat,
  );
  assert.equal(
    await gateway.resolveRefundProvider(PaymentProvider.Alipay),
    PaymentProvider.Alipay,
  );
});

test('支付网关保持官方渠道时所有渠道原样返回', async () => {
  const gateway = gatewayWith(PaymentGateway.Official);
  assert.equal(await gateway.resolvePaymentProvider(PaymentProvider.Wechat), PaymentProvider.Wechat);
  assert.equal(
    await gateway.resolvePaymentProvider(PaymentProvider.WechatJsapi),
    PaymentProvider.WechatJsapi,
  );
  assert.equal(await gateway.resolveRefundProvider(PaymentProvider.Wechat), PaymentProvider.Wechat);
});
