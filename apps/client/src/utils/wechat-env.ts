/** 判断当前是否运行在微信内置浏览器（公众号登录/JSAPI 支付的前提环境） */
export function isWechatBrowser(): boolean {
  return /micromessenger/i.test(navigator.userAgent);
}
