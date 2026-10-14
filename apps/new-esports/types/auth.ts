/**
 * 鉴权契约的最小镜像（单一来源：packages/contracts/src/rbac/auth.ts、sms/sms.ts、upload/storage.ts）。
 * 仅镜像本工程消费的字段；接入 workspace 后改用 @app/contracts。
 */

/** 当前登录用户资料（C 端消费的必要字段） */
export interface AuthProfile {
  id: string;
  username: string;
  nickname: string;
  /** 头像可访问 URL；未设置为空串 */
  avatar: string;
  /** 绑定手机号；未绑定为空串 */
  phone: string;
  /** 所属租户编码 */
  tenantCode: string;
}

/** 请求发送短信验证码入参 */
export interface SendSmsCodePayload {
  phone: string;
  tenantCode?: string;
}

/** 发送验证码后的返回：仅回传限流信息，不回传验证码本身 */
export interface SendSmsCodeResult {
  /** 距离可再次发送的冷却秒数 */
  cooldown: number;
}

/** 短信验证码登录入参（登录注册合一） */
export interface SmsLoginPayload {
  phone: string;
  code: string;
  tenantCode?: string;
}

/** 短信验证码登录返回（首登自动注册时 registered 为 true） */
export interface SmsLoginResult {
  accessToken: string;
  refreshToken: string;
  /** accessToken 过期秒数 */
  expiresIn: number;
  registered: boolean;
}

/** 自助更新本人资料入参（均可选） */
export interface UpdateProfilePayload {
  nickname?: string;
  /** 头像 URL（先经自助上传得到） */
  avatar?: string;
}

/** 当前用户资料更新后的对外视图（仅消费需要回填的字段） */
export interface UserView {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  phone: string;
}

/** 上传成功后返回的文件信息（仅消费可访问 URL） */
export interface UploadedFile {
  url: string;
  key: string;
  filename: string;
  size: number;
  mimeType: string;
}

/** 中国大陆手机号校验正则（与后端 DTO 共用同一规则） */
export const CHINA_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

/** 邀请码长度约束 */
export const INVITE_CODE_LENGTH = 8;
