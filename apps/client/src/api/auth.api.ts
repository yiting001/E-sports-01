import type {
  AuthProfile,
  SendSmsCodePayload,
  SendSmsCodeResult,
  SmsLoginPayload,
  SmsRegisterPayload,
  TokenPair,
} from '@app/contracts';
import { http } from './http';

/**
 * 用户端鉴权接口：仅短信验证码登录/注册与拉取当前用户档案。
 * 用户端不提供账号密码登录，注册用户由后端默认分配 member 角色。
 */
export const authApi = {
  /** 发送登录短信验证码（要求手机号已注册） */
  sendSmsLoginCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/code', payload);
  },
  /** 短信验证码登录 */
  smsLogin(payload: SmsLoginPayload): Promise<TokenPair> {
    return http.post('/auth/sms/login', payload);
  },
  /** 发送注册短信验证码（要求手机号未注册） */
  sendSmsRegisterCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/register-code', payload);
  },
  /** 短信验证码注册（注册用户默认 member 角色，并直接签发令牌） */
  smsRegister(payload: SmsRegisterPayload): Promise<TokenPair> {
    return http.post('/auth/sms/register', payload);
  },
  /** 拉取当前登录用户档案 */
  profile(): Promise<AuthProfile> {
    return http.get('/auth/profile');
  },
};
