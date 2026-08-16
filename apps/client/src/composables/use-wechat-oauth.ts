import { authApi } from '@/api/auth.api';
import { isWechatBrowser } from '@/utils/wechat-env';

/** 微信 OAuth 回跳 query 中的授权码键名（微信固定为 code，附带 state） */
const OAUTH_CODE_KEY = 'code';
const OAUTH_STATE_KEY = 'state';

/**
 * 微信公众号网页授权跳转/回跳工具（C 端）。
 * 登录页与结算页共用：跳转到微信授权页，回跳后从当前地址取 code；
 * code 一次性使用，消费后需从地址栏清除避免刷新重复兑换。
 */
export function useWechatOauth() {
  /** 跳转到微信公众号网页授权页，授权完成后回跳到当前页面地址 */
  async function startAuthorize(): Promise<void> {
    const redirectUri = buildRedirectUri();
    const { url } = await authApi.wechatAuthorizeUrl(redirectUri);
    window.location.href = url;
  }

  /** 当前地址（去掉旧的 code/state，避免回跳地址中嵌套过期授权码） */
  function buildRedirectUri(): string {
    const url = new URL(window.location.href);
    url.searchParams.delete(OAUTH_CODE_KEY);
    url.searchParams.delete(OAUTH_STATE_KEY);
    return url.toString();
  }

  /** 读取回跳携带的授权码；不在微信内或无 code 返回空串 */
  function readOauthCode(): string {
    if (!isWechatBrowser()) {
      return '';
    }
    return new URL(window.location.href).searchParams.get(OAUTH_CODE_KEY) ?? '';
  }

  /** 消费 code 后从地址栏清除（replaceState 不触发路由跳转与刷新） */
  function clearOauthCode(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(OAUTH_CODE_KEY);
    url.searchParams.delete(OAUTH_STATE_KEY);
    window.history.replaceState(window.history.state, '', url.toString());
  }

  return { startAuthorize, readOauthCode, clearOauthCode };
}
