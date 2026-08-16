import type {
  AgreementView,
  AuthProfile,
  SendSmsCodePayload,
  SendSmsCodeResult,
  SmsLoginPayload,
  SmsRegisterPayload,
  TokenPair,
  UpdateProfilePayload,
  UserView,
  WechatBindPayload,
  WechatIdentityStatusView,
  WechatLoginPayload,
  WechatOfficialAuthorizeUrlView,
} from '@app/contracts';
import { tenantContext } from '@/tenant/tenant-context';
import { http } from './http';

function withCurrentTenant<T extends { tenantCode?: string }>(payload: T): T {
  return { ...payload, tenantCode: tenantContext.getCode() };
}

/**
 * 鉴权接口封装（C 端）。
 * 仅暴露用户端需要的短信登录/注册与个人资料读取，
 * 每个方法对应一个后端路由，返回已解包的业务数据。
 */
export const authApi = {
  /** 读取用户协议正文（公开，登录前可访问） */
  agreement(): Promise<AgreementView> {
    return http.get('/config/agreement');
  },
  /** 发送「登录」短信验证码（要求手机号已注册） */
  sendLoginCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/code', withCurrentTenant(payload));
  },
  /** 短信验证码登录 */
  smsLogin(payload: SmsLoginPayload): Promise<TokenPair> {
    return http.post('/auth/sms/login', withCurrentTenant(payload));
  },
  /** 发送「注册」短信验证码（要求手机号未注册） */
  sendRegisterCode(payload: SendSmsCodePayload): Promise<SendSmsCodeResult> {
    return http.post('/auth/sms/register-code', withCurrentTenant(payload));
  },
  /** 短信验证码注册，注册用户默认分配 member 角色 */
  smsRegister(payload: SmsRegisterPayload): Promise<TokenPair> {
    return http.post('/auth/sms/register', withCurrentTenant(payload));
  },
  /** 获取当前登录用户资料 */
  profile(): Promise<AuthProfile> {
    return http.get('/auth/profile');
  },
  /** 自助更新本人资料（昵称/头像/手机号，均可选） */
  updateProfile(payload: UpdateProfilePayload): Promise<UserView> {
    return http.put('/auth/profile', payload);
  },
  /** 获取微信公众号网页授权地址（公开，登录前可访问） */
  wechatAuthorizeUrl(redirectUri: string): Promise<WechatOfficialAuthorizeUrlView> {
    return http.get('/auth/wechat/authorize-url', { params: { redirectUri } });
  },
  /** 微信公众号网页授权登录（首登自动注册 member 账号） */
  wechatLogin(payload: WechatLoginPayload): Promise<TokenPair> {
    return http.post('/auth/wechat/login', withCurrentTenant(payload));
  },
  /** 登录态绑定微信 openid（JSAPI 支付前置） */
  wechatBind(payload: WechatBindPayload): Promise<WechatIdentityStatusView> {
    return http.post('/auth/wechat/bind', payload);
  },
  /** 当前账号的微信绑定状态（不回传 openid） */
  wechatIdentity(): Promise<WechatIdentityStatusView> {
    return http.get('/auth/wechat/identity');
  },
};
