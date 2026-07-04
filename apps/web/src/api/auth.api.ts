import type {
  AuthProfile,
  LoginPayload,
  RegisterPayload,
  SendSmsCodePayload,
  SendSmsCodeResult,
  SmsLoginPayload,
  SmsRegisterPayload,
  TokenPair,
  UpdateProfilePayload,
  UserView,
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
  /** 发送注册短信验证码（仅未注册手机号） */
  sendSmsRegisterCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/register-code', payload);
  },
  /** 短信验证码注册，注册成功直接返回令牌对 */
  smsRegister(payload: SmsRegisterPayload): Promise<TokenPair> {
    return http.post('/auth/sms/register', payload);
  },
  profile(): Promise<AuthProfile> {
    return http.get('/auth/profile');
  },
  /** 自助更新本人资料（昵称/头像/手机号） */
  updateProfile(payload: UpdateProfilePayload): Promise<UserView> {
    return http.put('/auth/profile', payload);
  },
};
