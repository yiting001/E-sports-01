/**
 * 微信小程序虚拟支付调用（代币充值）。
 * 拉起参数由服务端按微信规则签名后下发：客户端必须把 signData（JSON 字符串）**原样透传**，
 * 不得再经 JSON.parse/stringify（字段顺序变化会导致验签失败）。
 * 该能力仅 mp-weixin 可用，其它端调用即拒绝。
 */

/** 拉起参数（与服务端 WechatVirtualPayParams 对应） */
export interface WxVirtualPayParams {
  signData: string;
  paySig: string;
  signature: string;
  mode: 'short_series_coin' | 'short_series_goods';
}

// #ifdef MP-WEIXIN
declare const wx: {
  requestVirtualPayment(options: {
    signData: string;
    mode: string;
    paySig: string;
    signature: string;
    success: () => void;
    fail: (error: { errMsg?: string; errCode?: number }) => void;
  }): void;
};
// #endif

/** 是否支持虚拟支付（仅小程序端） */
export const VIRTUAL_PAY_SUPPORTED = (() => {
  // #ifdef MP-WEIXIN
  return true;
  // #endif
  // #ifndef MP-WEIXIN
  return false;
  // #endif
})();

/** 取小程序 wx.login 的临时登录凭证（服务端换 session_key 用） */
export function getWxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (result) => {
        const code = (result as { code?: string }).code ?? '';
        if (code) {
          resolve(code);
          return;
        }
        reject(new Error('未获取到小程序登录凭证'));
      },
      fail: () => reject(new Error('小程序登录失败，请稍后重试')),
    });
  });
}

/** 发起虚拟支付；用户取消支付时抛出「已取消支付」，其它失败抛出渠道错误信息 */
export function requestVirtualPayment(params: WxVirtualPayParams): Promise<void> {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    wx.requestVirtualPayment({
      signData: params.signData,
      mode: params.mode,
      paySig: params.paySig,
      signature: params.signature,
      success: () => resolve(),
      fail: (error) => {
        const message = error?.errMsg ?? '';
        reject(new Error(message.includes('cancel') ? '已取消支付' : `支付失败（${error?.errCode ?? '未知'}）`));
      },
    });
  });
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.reject(new Error('微信虚拟支付仅支持小程序端'));
  // #endif
}
