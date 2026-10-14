/**
 * 配置中心公开契约的最小镜像（单一来源：packages/contracts/src/config/config.ts）。
 * 仅镜像本工程消费的字段；接入 workspace 后改用 @app/contracts。
 */

/** 平台品牌（软件名称 + 图标） */
export interface BrandingView {
  appName: string;
  /** 软件图标 URL，未配置则为空串 */
  appLogo: string;
}

/** C 端门户开关配置（公开，登录前即可读取） */
export interface PortalConfigView {
  /** 是否展示排行榜入口 */
  showRank: boolean;
  /** 是否在 C 端加载 vConsole 调试面板 */
  vConsoleEnabled: boolean;
  /** 是否启用语音播报 */
  voiceNotifyEnabled: boolean;
  /** 是否开启手机号验证码登录/注册 */
  smsLoginEnabled: boolean;
  /** 是否开启微信公众号网页授权登录（小程序端不适用） */
  wechatOfficialLoginEnabled: boolean;
  /** 是否开启微信公众号 JSAPI 支付（小程序端不适用） */
  wechatJsapiPayEnabled: boolean;
}

/** 用户协议（富文本 HTML，未配置为空串） */
export interface AgreementView {
  contentHtml: string;
}

/** 软件名称兜底值（配置中心不可用时的展示名） */
export const DEFAULT_APP_NAME = '天玺电竞';
