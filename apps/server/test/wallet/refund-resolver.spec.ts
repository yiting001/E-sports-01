import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentProvider } from '@app/contracts';
import { RefundResolver } from '../../src/modules/wallet/application/refund.resolver';
import type { RefundPort } from '../../src/modules/wallet/domain/refund-port.interface';

test('退款解析器按渠道返回对应驱动，未注册渠道明确失败', () => {
  const alipay = { provider: PaymentProvider.Alipay } as RefundPort;
  const resolver = new RefundResolver([alipay]);

  assert.equal(resolver.resolve(PaymentProvider.Alipay), alipay);
  assert.throws(() => resolver.resolve(PaymentProvider.Wechat), /未注册的退款渠道：wechat/);
});
