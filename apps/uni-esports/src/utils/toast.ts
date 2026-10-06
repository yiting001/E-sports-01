/**
 * 全局轻提示（单一来源）。
 * 对齐 apps/client 的交互约定：接口错误统一走 toast，调用方可用 silent 关闭自行处理。
 */

const TOAST_DURATION_MS = 2000;
const DUPLICATE_SUPPRESS_MS = 1500;

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
    title: text.length > 30 ? `${text.slice(0, 30)}…` : text,
    icon: 'none',
    duration: TOAST_DURATION_MS,
  });
}
