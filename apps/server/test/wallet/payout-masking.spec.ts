import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PayoutProvider } from '@app/contracts';
import {
  maskIdCardNo,
  maskPayoutAccount,
  maskPhone,
} from '../../src/modules/wallet/application/payout-masking';

test('银行卡号与微信 openid 脱敏保留首尾各 4 位，支付宝登录号原样返回', () => {
  assert.equal(
    maskPayoutAccount(PayoutProvider.BankCard, '6222021234567890123'),
    '6222****0123',
  );
  assert.equal(
    maskPayoutAccount(PayoutProvider.JqfBankCard, '6222021234567890123'),
    '6222****0123',
  );
  assert.equal(maskPayoutAccount(PayoutProvider.JqfWechat, 'oABCDEFG12345678'), 'oABC****5678');
  assert.equal(maskPayoutAccount(PayoutProvider.BankCard, '12345678'), '****');
  assert.equal(maskPayoutAccount(PayoutProvider.Alipay, 'user@example.com'), 'user@example.com');
  assert.equal(maskPayoutAccount(PayoutProvider.JqfAlipay, '13800138000'), '13800138000');
});

test('身份证号保留前 6 后 4，手机号保留前 3 后 4，空值透传', () => {
  assert.equal(maskIdCardNo('110101199001011234'), '110101****1234');
  assert.equal(maskIdCardNo(null), null);
  assert.equal(maskPhone('13800138000'), '138****8000');
  assert.equal(maskPhone(null), null);
});
