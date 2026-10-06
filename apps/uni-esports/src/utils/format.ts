/**
 * 展示格式化工具（纯函数，可单测）。
 */

/** 分转元字符串，固定两位小数（服务端金额统一以「分」存储） */
export function fenToYuan(fen: number): string {
  return (fen / 100).toFixed(2);
}

/** 价格展示标签：¥ 前缀 + 千元内不分组，保持与 client 一致的简洁形态 */
export function priceLabel(fen: number): string {
  return `¥${fenToYuan(fen)}`;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 时间展示：兼容毫秒时间戳（IM）与 ISO 字符串（REST），统一 YYYY-MM-DD HH:mm */
export function formatDateTime(value: number | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const h = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${h}`;
}

/** 聊天气泡时间：当天只展示时分，跨天补日期 */
export function formatChatTime(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const h = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (sameDay) {
    return h;
  }
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${h}`;
}
