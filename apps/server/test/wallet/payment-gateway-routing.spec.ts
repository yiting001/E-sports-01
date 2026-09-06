import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONFIG_KEYS,
  JqfTransferIfCode,
  PaymentGateway,
  PaymentProvider,
  PayoutProvider,
} from '@app/contracts';
import { PaymentGatewayService } from '../../src/modules/wallet/application/payment-gateway.service';
import type { ConfigService } from '../../src/modules/config/application/config.service';

function createService(values: Record<string, string>): PaymentGatewayService {
  const config = {
    getString: async (key: string, fallback: string) => values[key] ?? fallback,
  } as Pick<ConfigService, 'getString'> as ConfigService;
  return new PaymentGatewayService(config);
}

test('提现网关未配置时默认计全付：仅提供银行卡，映射为计全付银行卡转账', async () => {
  const service = createService({});

  assert.equal(await service.payoutGateway(), PaymentGateway.Jqf);
  assert.deepEqual(await service.withdrawMethods(), [PayoutProvider.BankCard]);
  assert.equal(service.resolvePayoutProvider(PayoutProvider.BankCard), PayoutProvider.JqfBankCard);
});

test('提现网关显式配为 official 时仅提供支付宝官方直连', async () => {
  const service = createService({
    [CONFIG_KEYS.wallet.payoutGateway]: PaymentGateway.Official,
  });

  assert.equal(await service.payoutGateway(), PaymentGateway.Official);
  assert.deepEqual(await service.withdrawMethods(), [PayoutProvider.Alipay]);
  assert.equal(service.resolvePayoutProvider(PayoutProvider.Alipay), PayoutProvider.Alipay);
  assert.equal(await service.withdrawPhoneRequired(), false);
});

test('计全付银行卡接口为易宝时要求预留手机号，默认支付宝安全发不要求', async () => {
  assert.equal(await createService({}).withdrawPhoneRequired(), false);
  assert.equal(
    await createService({
      [CONFIG_KEYS.wallet.jqfTransferIfCode]: JqfTransferIfCode.YeePay,
    }).withdrawPhoneRequired(),
    true,
  );
  assert.equal(
    await createService({
      [CONFIG_KEYS.wallet.payoutGateway]: PaymentGateway.Official,
      [CONFIG_KEYS.wallet.jqfTransferIfCode]: JqfTransferIfCode.YeePay,
    }).withdrawPhoneRequired(),
    false,
  );
});

test('已解析为实际执行渠道的提现渠道原样返回，历史支付宝/微信零钱单不受影响', () => {
  const service = createService({});

  assert.equal(service.resolvePayoutProvider(PayoutProvider.JqfAlipay), PayoutProvider.JqfAlipay);
  assert.equal(service.resolvePayoutProvider(PayoutProvider.JqfWechat), PayoutProvider.JqfWechat);
  assert.equal(service.resolvePayoutProvider(PayoutProvider.JqfBankCard), PayoutProvider.JqfBankCard);
  assert.equal(service.resolvePayoutProvider(PayoutProvider.Wechat), PayoutProvider.Wechat);
});

test('支付网关未配置时仍默认官方直连，不受提现默认值影响', async () => {
  const service = createService({});

  assert.equal(await service.resolvePaymentProvider(PaymentProvider.Wechat), PaymentProvider.Wechat);
  assert.equal(await service.resolvePaymentProvider(PaymentProvider.Alipay), PaymentProvider.Alipay);
  assert.equal(await service.resolveRefundProvider(PaymentProvider.Alipay), PaymentProvider.Alipay);
});
