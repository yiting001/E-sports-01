import type { WechatJsapiPayParams } from '@app/contracts';

/** WeixinJSBridge.invoke 支付结果回调参数 */
interface WeixinJsBridgeInvokeResult {
  err_msg?: string;
}

/** 微信内置浏览器注入的 JS bridge（仅使用支付所需的最小面） */
interface WeixinJsBridge {
  invoke(
    method: 'getBrandWCPayRequest',
    params: Record<string, string>,
    callback: (res: WeixinJsBridgeInvokeResult) => void,
  ): void;
}

declare global {
  interface Window {
    WeixinJSBridge?: WeixinJsBridge;
  }
}

/** JSAPI 拉起支付的结果：成功 / 用户取消 / 失败 */
export type WechatJsapiPayOutcome = 'ok' | 'cancel' | 'fail';

const BRIDGE_READY_EVENT = 'WeixinJSBridgeReady';
const BRIDGE_READY_TIMEOUT_MS = 5000;

/** 等待微信 JS bridge 注入完成（页面刚加载时 bridge 可能尚未就绪） */
function waitForBridge(): Promise<WeixinJsBridge | null> {
  if (window.WeixinJSBridge) {
    return Promise.resolve(window.WeixinJSBridge);
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(window.WeixinJSBridge ?? null), BRIDGE_READY_TIMEOUT_MS);
    document.addEventListener(
      BRIDGE_READY_EVENT,
      () => {
        window.clearTimeout(timer);
        resolve(window.WeixinJSBridge ?? null);
      },
      { once: true },
    );
  });
}

/**
 * 在微信内拉起公众号 JSAPI 收银台。
 * bridge 不可用（非微信环境或注入失败）按失败处理，由调用方给出提示。
 */
export async function invokeWechatJsapiPay(
  params: WechatJsapiPayParams,
): Promise<WechatJsapiPayOutcome> {
  const bridge = await waitForBridge();
  if (!bridge) {
    return 'fail';
  }
  return new Promise((resolve) => {
    bridge.invoke(
      'getBrandWCPayRequest',
      {
        appId: params.appId,
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType,
        paySign: params.paySign,
      },
      (res) => {
        if (res.err_msg === 'get_brand_wcpay_request:ok') {
          resolve('ok');
        } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
          resolve('cancel');
        } else {
          resolve('fail');
        }
      },
    );
  });
}
