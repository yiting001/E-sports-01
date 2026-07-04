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
 * 鉴权接口封装（C 端）。
 * 仅暴露用户端需要的短信登录/注册与个人资料读取，
 * 每个方法对应一个后端路由，返回已解包的业务数据。
 */
export const authApi = {
  /** 发送「登录」短信验证码（要求手机号已注册） */
  sendLoginCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/code', payload);
  },
  /** 短信验证码登录 */
  smsLogin(payload: SmsLoginPayload): Promise<TokenPair> {
    return http.post('/auth/sms/login', payload);
  },
  /** 发送「注册」短信验证码（要求手机号未注册） */
  sendRegisterCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/register-code', payload);
  },
  /** 短信验证码注册，注册用户默认分配 member 角色 */
  smsRegister(payload: SmsRegisterPayload): Promise<TokenPair> {
    return http.post('/auth/sms/register', payload);
  },
  /** 获取当前登录用户资料 */
  profile(): Promise<AuthProfile> {
    return http.get('/auth/profile');
  },
};
