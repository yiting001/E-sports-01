import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG_KEYS, PaymentGateway, PaymentProvider, PayoutProvider } from '@app/contracts';
import { PaymentGatewayService } from '../../src/modules/wallet/application/payment-gateway.service';
import type { ConfigService } from '../../src/modules/config/application/config.service';

function createService(values: Record<string, string>): PaymentGatewayService {
  const config = {
    getString: async (key: string, fallback: string) => values[key] ?? fallback,
  } as Pick<ConfigService, 'getString'> as ConfigService;
  return new PaymentGatewayService(config);
}

test('提现网关未配置时默认走计全付转账（支付宝 / 微信零钱）', async () => {
  const service = createService({});

  assert.equal(await service.resolvePayoutProvider(PayoutProvider.Alipay), PayoutProvider.JqfAlipay);
  assert.equal(await service.resolvePayoutProvider(PayoutProvider.Wechat), PayoutProvider.JqfWechat);
});

test('提现网关显式配为 official 时才回退官方直连', async () => {
  const service = createService({
    [CONFIG_KEYS.wallet.payoutGateway]: PaymentGateway.Official,
  });

  assert.equal(await service.resolvePayoutProvider(PayoutProvider.Alipay), PayoutProvider.Alipay);
  assert.equal(await service.resolvePayoutProvider(PayoutProvider.Wechat), PayoutProvider.Wechat);
});

test('已解析为计全付的提现渠道原样返回，不重复映射', async () => {
  const service = createService({});

  assert.equal(
    await service.resolvePayoutProvider(PayoutProvider.JqfAlipay),
    PayoutProvider.JqfAlipay,
  );
  assert.equal(
    await service.resolvePayoutProvider(PayoutProvider.JqfWechat),
    PayoutProvider.JqfWechat,
  );
});

test('支付网关未配置时仍默认官方直连，不受提现默认值影响', async () => {
  const service = createService({});

  assert.equal(await service.resolvePaymentProvider(PaymentProvider.Wechat), PaymentProvider.Wechat);
  assert.equal(await service.resolvePaymentProvider(PaymentProvider.Alipay), PaymentProvider.Alipay);
  assert.equal(await service.resolveRefundProvider(PaymentProvider.Alipay), PaymentProvider.Alipay);
});
