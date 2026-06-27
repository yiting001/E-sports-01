import type {
  AuthProfile,
  LoginPayload,
  RegisterPayload,
  SendSmsCodePayload,
  SendSmsCodeResult,
  SmsLoginPayload,
  TokenPair,
} from '@app/contracts';
import { http } from './http';

/** 鉴权相关接口：登录 / 注册 / 短信验证码 / 拉取当前用户档案 */
export const authApi = {
  login(payload: LoginPayload): Promise<TokenPair> {
    return http.post('/auth/login', payload);
  },
  register(payload: RegisterPayload): Promise<TokenPair> {
    return http.post('/auth/register', payload);
  },
  /** 发送登录短信验证码 */
  sendSmsCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/code', payload);
  },
  /** 短信验证码登录 */
  smsLogin(payload: SmsLoginPayload): Promise<TokenPair> {
    return http.post('/auth/sms/login', payload);
  },
  profile(): Promise<AuthProfile> {
    return http.get('/auth/profile');
  },
};
