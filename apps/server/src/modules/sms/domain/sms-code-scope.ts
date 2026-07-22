export enum SmsCodePurpose {
  Login = 'login',
  Register = 'register',
}

/** 验证码作用域：同一手机号在不同租户和用途下不能互相复用。 */
export interface SmsCodeScope {
  purpose: SmsCodePurpose;
  tenantId: string;
}
