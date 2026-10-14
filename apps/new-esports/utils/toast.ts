/**
 * 全局轻提示（单一来源）。
 * 对齐 apps/client 的交互约定：接口错误统一走 toast，调用方可用 silent 关闭自行处理；
 * 短时间内重复文案直接忽略，避免并发请求同时失败时弹层互相顶掉。
 */

const TOAST_DURATION_MS = 2000;
const DUPLICATE_SUPPRESS_MS = 1500;
/** 超长文案截断长度（与 apps/uni-esports 一致）：保留完整语义，同时避免弹层超出两行显示上限 */
const TOAST_MAX_CHARS = 30;

let lastMessage = '';
let lastShownAt = 0;

export function toast(message: string): void {
  const text = message?.trim();
  if (!text) {
    return;
  }
  const now = Date.now();
  if (text === lastMessage && now - lastShownAt < DUPLICATE_SUPPRESS_MS) {
    return;
  }
  lastMessage = text;
  lastShownAt = now;
  uni.showToast({
    title: text.length > TOAST_MAX_CHARS ? `${text.slice(0, TOAST_MAX_CHARS)}…` : text,
    icon: 'none',
    duration: TOAST_DURATION_MS,
  });
}
