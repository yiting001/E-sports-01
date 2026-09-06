import { PayoutProvider } from '@app/contracts';

/** 需脱敏展示收款标识的渠道：微信零钱（openid）与银行卡（卡号） */
const MASKED_ACCOUNT_PROVIDERS = new Set<PayoutProvider>([
  PayoutProvider.Wechat,
  PayoutProvider.JqfWechat,
  PayoutProvider.BankCard,
  PayoutProvider.JqfBankCard,
]);

function maskMiddle(value: string, head: number, tail: number): string {
  if (value.length <= head + tail) {
    return '****';
  }
  return `${value.slice(0, head)}****${value.slice(-tail)}`;
}

/** 微信 openid / 银行卡号脱敏展示（保留首尾各 4 位）；支付宝登录号原样返回 */
export function maskPayoutAccount(provider: PayoutProvider, account: string): string {
  return MASKED_ACCOUNT_PROVIDERS.has(provider) ? maskMiddle(account, 4, 4) : account;
}

/** 身份证号脱敏（保留前 6 位与后 4 位） */
export function maskIdCardNo(idCardNo: string | null): string | null {
  return idCardNo === null ? null : maskMiddle(idCardNo, 6, 4);
}

/** 手机号脱敏（保留前 3 位与后 4 位） */
export function maskPhone(phone: string | null): string | null {
  return phone === null ? null : maskMiddle(phone, 3, 4);
}
