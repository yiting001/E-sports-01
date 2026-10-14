import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { CONFIG_KEYS, PaymentProvider } from '@app/contracts';
import {
  resolvePaidAmountFen,
  signHmacSha256,
  WECHAT_VIRTUAL_ATTACH,
  WechatVirtualPaymentDriver,
} from '../../src/modules/wallet/infrastructure/drivers/wechat-virtual-payment.driver';
import { WechatVirtualPayConfigFactory } from '../../src/modules/wallet/infrastructure/drivers/wechat-virtual-pay.config';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import type { PaymentCallbackRequest } from '../../src/modules/wallet/domain/payment-port.interface';

/** 构造只读配置的 ConfigService 桩（与既有钱包测试同风格） */
function createConfig(values: Record<string, string>): ConfigService {
  return {
    getString: async (key: string, fallback: string) => values[key] ?? fallback,
    getNumber: async (key: string, fallback: number) => {
      const raw = values[key];
      return raw === undefined ? fallback : Number(raw);
    },
  } as Pick<ConfigService, 'getString' | 'getNumber'> as ConfigService;
}

const FULL_CONFIG: Record<string, string> = {
  [CONFIG_KEYS.wallet.wechatVirtualAppId]: 'wx-test-appid',
  [CONFIG_KEYS.wallet.wechatVirtualAppSecret]: 'test-appsecret',
  [CONFIG_KEYS.wallet.wechatVirtualOfferId]: '1234567890',
  [CONFIG_KEYS.wallet.wechatVirtualAppKey]: 'test-appkey',
  [CONFIG_KEYS.wallet.wechatVirtualCoinPerYuan]: '1',
  [CONFIG_KEYS.wallet.wechatVirtualEnv]: '0',
};

function createDriver(values: Record<string, string>): WechatVirtualPaymentDriver {
  return new WechatVirtualPaymentDriver(
    new WechatVirtualPayConfigFactory(createConfig(values)),
  );
}

function callbackRequest(body: Record<string, unknown>): PaymentCallbackRequest {
  return { body, rawBody: JSON.stringify(body), headers: {} };
}

test('虚拟支付渠道标识与配置缺失时的报错', async () => {
  const driver = createDriver({});
  assert.equal(driver.provider, PaymentProvider.WechatVirtual);
  await assert.rejects(
    () => driver.createRecharge({
      outTradeNo: 'R20260801001',
      amountFen: 600,
      subject: '钱包充值',
      notifyUrl: 'https://example.com/api/wallet/recharge/callback/wechat_virtual',
      payerLoginCode: 'test-code',
    }),
    /虚拟支付未配置/,
  );
});

test('缺少小程序登录凭证时明确报错（不静默失败）', async () => {
  const driver = createDriver(FULL_CONFIG);
  await assert.rejects(
    () => driver.createRecharge({
      outTradeNo: 'R20260801002',
      amountFen: 600,
      subject: '钱包充值',
      notifyUrl: 'https://example.com/callback',
    }),
    /缺少小程序登录凭证/,
  );
});

test('paySig 与用户态签名按微信规则计算（HMAC-SHA256）', () => {
  const signData = JSON.stringify({
    offerId: '1234567890',
    buyQuantity: 6,
    currencyType: 'CNY',
    env: 0,
    outTradeNo: 'R20260801003',
    attach: WECHAT_VIRTUAL_ATTACH,
  });
  const expectedPaySig = createHmac('sha256', 'test-appkey')
    .update(`requestVirtualPayment&${signData}`)
    .digest('hex');
  const expectedSignature = createHmac('sha256', 'session-key-abc')
    .update(signData)
    .digest('hex');

  assert.equal(signHmacSha256(signData, 'test-appkey', 'requestVirtualPayment'), expectedPaySig);
  assert.equal(signHmacSha256(signData, 'session-key-abc'), expectedSignature);
});

test('代币数量按「每元代币数」换算成金额（分）', () => {
  assert.equal(resolvePaidAmountFen({ Coin: 6 }, 1), 600);
  assert.equal(resolvePaidAmountFen({ Coin: 60 }, 10), 600);
  assert.equal(resolvePaidAmountFen({ CoinInfo: { BuyQuantity: 30 } }, 5), 600);
});

test('优先取法币金额字段，兼容嵌套结构', () => {
  assert.equal(resolvePaidAmountFen({ TotalFee: 1280 }, 1), 1280);
  assert.equal(resolvePaidAmountFen({ WechatPayInfo: { Amount: 500 } }, 1), 500);
  assert.equal(resolvePaidAmountFen({ GoodsPrice: 9900, Coin: 1 }, 1), 9900);
});

test('金额与代币字段都缺失时返回 null（由驱动抛出可诊断错误）', () => {
  assert.equal(resolvePaidAmountFen({ OpenId: 'oX', Env: 0 }, 1), null);
});

test('代币支付回调解析出业务单号与金额', async () => {
  const driver = createDriver(FULL_CONFIG);
  const result = await driver.parseCallback(
    callbackRequest({
      MsgType: 'event',
      Event: 'xpay_coin_pay_notify',
      OpenId: 'oX-123',
      OutTradeNo: 'R20260801004',
      Env: 0,
      BillNo: '4200001',
      Coin: 60,
    }),
  );

  assert.equal(result.success, true);
  assert.equal(result.outTradeNo, 'R20260801004');
  assert.equal(result.paidAmountFen, 6000);
  assert.equal(result.providerTradeNo, '4200001');
});

test('缺失业务单号或金额时抛出可诊断错误（列出收到的字段）', async () => {
  const driver = createDriver(FULL_CONFIG);
  await assert.rejects(
    () => driver.parseCallback(callbackRequest({ Event: 'xpay_coin_pay_notify' })),
    /缺少 OutTradeNo/,
  );
  await assert.rejects(
    () => driver.parseCallback(
      callbackRequest({ Event: 'xpay_coin_pay_notify', OutTradeNo: 'R1' }),
    ),
    /缺少金额字段.*Event, OutTradeNo/,
  );
});

test('未知事件类型的回调被拒绝，并提示 JSON 推送要求', async () => {
  const driver = createDriver(FULL_CONFIG);
  await assert.rejects(
    () => driver.parseCallback(callbackRequest({ Event: 'some_other_event' })),
    /回调事件不支持/,
  );
});

test('主动查单返回未支付（虚拟支付以回调为权威）与回调应答报文', async () => {
  const driver = createDriver(FULL_CONFIG);
  const queried = await driver.queryTrade('R20260801005');
  assert.equal(queried.paid, false);
  assert.equal(queried.paidAmountFen, 0);
  assert.equal(driver.callbackAck(), JSON.stringify({ ErrCode: 0, ErrMsg: 'Success' }));
});
