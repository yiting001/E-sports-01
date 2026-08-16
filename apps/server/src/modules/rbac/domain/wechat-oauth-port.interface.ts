export const WECHAT_OAUTH_PORT = Symbol('WECHAT_OAUTH_PORT');

/**
 * 微信公众号网页授权（OAuth snsapi_base）端口。
 * 登录用例只依赖该抽象；凭证读取与微信 HTTP 调用在基础设施层实现。
 */
export interface WechatOauthPort {
  /** 生成公众号网页授权跳转地址（scope=snsapi_base） */
  buildAuthorizeUrl(redirectUri: string): Promise<string>;
  /** 用授权码换取 openid；code 无效/过期抛领域可读异常 */
  exchangeOpenid(code: string): Promise<string>;
}
