import { authApi } from '@/api/auth.api';
import { isWechatBrowser } from '@/utils/wechat-env';

/** 微信 OAuth 回跳 query 中的授权码键名（微信固定为 code，附带 state） */
const OAUTH_CODE_KEY = 'code';
const OAUTH_STATE_KEY = 'state';

/** 从 hash 路由的 query 段（# 之后的 ?）解析参数；无 query 段时返回空集合 */
function parseHashQuery(hash: string): URLSearchParams {
  const queryIndex = hash.indexOf('?');
  return new URLSearchParams(queryIndex < 0 ? '' : hash.slice(queryIndex + 1));
}

/** 从 hash 中移除 code/state 参数，保留其余 query */
function stripOauthParamsFromHash(hash: string): string {
  const queryIndex = hash.indexOf('?');
  if (queryIndex < 0) {
    return hash;
  }
  const params = parseHashQuery(hash);
  params.delete(OAUTH_CODE_KEY);
  params.delete(OAUTH_STATE_KEY);
  const query = params.toString();
  const path = hash.slice(0, queryIndex);
  return query ? `${path}?${query}` : path;
}

/**
 * 微信公众号网页授权跳转/回跳工具（C 端）。
 * 登录页与结算页共用：跳转到微信授权页，回跳后从当前地址取 code；
 * hash 路由下微信将 code 拼接在地址末尾（落在 # 之后），因此 search 与 hash query 两处都要兼容；
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
    url.hash = stripOauthParamsFromHash(url.hash);
    return url.toString();
  }

  /** 读取回跳携带的授权码；不在微信内或无 code 返回空串 */
  function readOauthCode(): string {
    if (!isWechatBrowser()) {
      return '';
    }
    const url = new URL(window.location.href);
    return (
      url.searchParams.get(OAUTH_CODE_KEY) ??
      parseHashQuery(url.hash).get(OAUTH_CODE_KEY) ??
      ''
    );
  }

  /** 消费 code 后从地址栏清除（replaceState 不触发路由跳转与刷新） */
  function clearOauthCode(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(OAUTH_CODE_KEY);
    url.searchParams.delete(OAUTH_STATE_KEY);
    url.hash = stripOauthParamsFromHash(url.hash);
    window.history.replaceState(window.history.state, '', url.toString());
  }

  return { startAuthorize, readOauthCode, clearOauthCode };
}
