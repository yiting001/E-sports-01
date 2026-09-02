import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import {
  PAY_RETURN_URL_MAX_LENGTH,
  PaymentProvider,
  RechargeStatus,
  type WechatJsapiPayParams,
} from '@app/contracts';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import { buildPayReturnUrl } from '../../src/modules/wallet/application/pay-return-url';
import type { PaymentResolver } from '../../src/modules/wallet/application/payment.resolver';
import { CreateRechargeUseCase } from '../../src/modules/wallet/application/use-cases/create-recharge.usecase';
import type { WalletService } from '../../src/modules/wallet/application/wallet.service';
import type { WechatJsapiPayerService } from '../../src/modules/wallet/application/wechat-jsapi-payer.service';
import type {
  RechargeCreateInput,
  RechargeCreateResult,
} from '../../src/modules/wallet/domain/payment-port.interface';
import type { RechargeOrderEntity } from '../../src/modules/wallet/domain/recharge-order.entity';
import type { RechargeOrderRepository } from '../../src/modules/wallet/domain/recharge-repository.interface';
import { passthroughPaymentGateway } from '../order/payment-gateway.stub';

const RETURN_URL = 'https://m.example.test/#/wallet';

const JSAPI_PARAMS: WechatJsapiPayParams = {
  appId: 'wx-test-app',
  timeStamp: '1700000000',
  nonceStr: 'nonce',
  package: 'prepay_id=test',
  signType: 'RSA',
  paySign: 'sign',
};

test('支付回跳地址无占位符时追加 payRef query，兼容已带 query 的地址', () => {
  assert.equal(
    buildPayReturnUrl(RETURN_URL, 'R20260722000000123456'),
    `${RETURN_URL}?payRef=R20260722000000123456`,
  );
  assert.equal(
    buildPayReturnUrl(`${RETURN_URL}?from=app`, 'R1'),
    `${RETURN_URL}?from=app&payRef=R1`,
  );
  assert.equal(
    buildPayReturnUrl('https://m.example.test/?from=app#/wallet', 'R1'),
    'https://m.example.test/?from=app#/wallet?payRef=R1',
  );
  assert.equal(buildPayReturnUrl(undefined, 'R1'), undefined);
  assert.equal(buildPayReturnUrl('', 'R1'), undefined);
});

test('支付回跳地址含 {payRef} 占位符时原位替换为单据标识（直接跳订单详情）', () => {
  assert.equal(
    buildPayReturnUrl('https://m.example.test/#/orders/{payRef}', 'order-1'),
    'https://m.example.test/#/orders/order-1',
  );
  assert.equal(
    buildPayReturnUrl('https://m.example.test/#/orders/{payRef}?tab=all', 'a/b c'),
    'https://m.example.test/#/orders/a%2Fb%20c?tab=all',
  );
});

test('支付回跳地址写入业务参数后超过计全付字段上限时拒绝', () => {
  const longUrl = `https://m.example.test/${'a'.repeat(PAY_RETURN_URL_MAX_LENGTH)}`;
  assert.throws(() => buildPayReturnUrl(longUrl, 'R1'), BadRequestException);
});

interface RechargeFixture {
  useCase: CreateRechargeUseCase;
  createInputs: RechargeCreateInput[];
  savedOrders: RechargeOrderEntity[];
  openidLookups: string[];
}

function createFixture(portResult: RechargeCreateResult): RechargeFixture {
  const createInputs: RechargeCreateInput[] = [];
  const savedOrders: RechargeOrderEntity[] = [];
  const openidLookups: string[] = [];
  const walletService = {
    ensureWallet: async () => ({ id: 'wallet-1' }),
  } as unknown as WalletService;
  const paymentResolver = {
    resolve: (provider: PaymentProvider) => ({
      provider,
      createRecharge: async (input: RechargeCreateInput) => {
        createInputs.push(input);
        return portResult;
      },
    }),
  } as unknown as PaymentResolver;
  const config = {
    getNumber: async (_key: string, fallback: number) => fallback,
    getString: async () => 'https://api.example.test',
  } as unknown as ConfigService;
  const jsapiPayer = {
    resolveOpenid: async (userId: string) => {
      openidLookups.push(userId);
      return 'openid-1';
    },
  } as unknown as WechatJsapiPayerService;
  const rechargeRepo = {
    save: async (order: RechargeOrderEntity) => {
      order.id = `recharge-${savedOrders.length + 1}`;
      savedOrders.push(order);
      return order;
    },
  } as unknown as RechargeOrderRepository;
  return {
    useCase: new CreateRechargeUseCase(
      walletService,
      paymentResolver,
      passthroughPaymentGateway(),
      config,
      jsapiPayer,
      rechargeRepo,
    ),
    createInputs,
    savedOrders,
    openidLookups,
  };
}

test('扫码充值透传带充值单号的回跳地址，返回二维码且 jsapiParams 为 null', async () => {
  const fixture = createFixture({ qrCode: 'weixin://wxpay/test' });
  const result = await fixture.useCase.execute('user-1', {
    amountFen: 1000,
    provider: PaymentProvider.Wechat,
    returnUrl: RETURN_URL,
  });

  assert.equal(fixture.createInputs.length, 1);
  const input = fixture.createInputs[0];
  assert.equal(input.outTradeNo, result.outTradeNo);
  assert.equal(input.returnUrl, `${RETURN_URL}?payRef=${result.outTradeNo}`);
  assert.equal(input.payerOpenid, undefined);
  assert.equal(input.notifyUrl, 'https://api.example.test/wallet/recharge/callback/wechat');
  assert.deepEqual(fixture.openidLookups, []);
  assert.equal(result.qrCode, 'weixin://wxpay/test');
  assert.equal(result.jsapiParams, null);
  assert.equal(fixture.savedOrders[0].status, RechargeStatus.Pending);
  assert.equal(fixture.savedOrders[0].provider, PaymentProvider.Wechat);
});

test('公众号 JSAPI 充值先取付款人 openid，返回拉起支付参数', async () => {
  const fixture = createFixture({ qrCode: '', jsapiParams: JSAPI_PARAMS });
  const result = await fixture.useCase.execute('user-2', {
    amountFen: 1000,
    provider: PaymentProvider.WechatJsapi,
  });

  assert.deepEqual(fixture.openidLookups, ['user-2']);
  assert.equal(fixture.createInputs[0].payerOpenid, 'openid-1');
  assert.equal(fixture.createInputs[0].returnUrl, undefined);
  assert.deepEqual(result.jsapiParams, JSAPI_PARAMS);
  assert.equal(result.qrCode, '');
  assert.equal(result.provider, PaymentProvider.WechatJsapi);
});

test('充值金额低于下限时拒绝且不落单', async () => {
  const fixture = createFixture({ qrCode: 'x' });
  await assert.rejects(
    fixture.useCase.execute('user-1', { amountFen: 0, provider: PaymentProvider.Alipay }),
    BadRequestException,
  );
  assert.equal(fixture.savedOrders.length, 0);
});
