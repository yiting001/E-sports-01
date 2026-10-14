import type {
  AuthProfile,
  SendSmsCodePayload,
  SendSmsCodeResult,
  SmsLoginPayload,
  SmsLoginResult,
  UpdateProfilePayload,
  UserView,
} from '@/types/auth';
import { http } from './http';

/**
 * 鉴权接口封装（C 端）。
 * 登录方式为短信验证码（登录注册合一，未注册手机号首登自动注册 member）；
 * 小程序微信登录需服务端提供 code2session 端点，暂不接入，
 * 与 apps/uni-esports 的处理一致。
 */
export const authApi = {
  /** 发送登录短信验证码（未注册手机号也可发码） */
  sendLoginCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/code', payload);
  },

  /** 短信验证码登录（首登自动注册并回传 registered 标记） */
  smsLogin(payload: SmsLoginPayload): Promise<SmsLoginResult> {
    return http.post('/auth/sms/login', payload);
  },

  /** 获取当前登录用户资料 */
  profile(): Promise<AuthProfile> {
    return http.get('/auth/profile');
  },

  /** 自助更新本人资料（昵称/头像，均可选） */
  updateProfile(payload: UpdateProfilePayload): Promise<UserView> {
    return http.put('/auth/profile', payload);
  },
};
