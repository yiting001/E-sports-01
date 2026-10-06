import { describe, expect, it } from 'vitest';
import {
  fenToYuan,
  formatChatTime,
  formatDateTime,
  priceLabel,
} from './format';

describe('fenToYuan', () => {
  it('正确换算分到元并保留两位小数', () => {
    expect(fenToYuan(0)).toBe('0.00');
    expect(fenToYuan(1)).toBe('0.01');
    expect(fenToYuan(123456)).toBe('1234.56');
  });

  it('避免浮点精度误差', () => {
    expect(fenToYuan(660)).toBe('6.60');
    expect(fenToYuan(1990)).toBe('19.90');
  });
});

describe('priceLabel', () => {
  it('输出带 ¥ 前缀的价格', () => {
    expect(priceLabel(120000)).toBe('¥1200.00');
  });
});

describe('formatDateTime', () => {
  it('格式化毫秒时间戳', () => {
    const ts = new Date('2026-10-06T09:05:00').getTime();
    expect(formatDateTime(ts)).toBe('2026-10-06 09:05');
  });

  it('兼容 ISO 字符串', () => {
    expect(formatDateTime('2026-10-06T09:05:00Z')).toMatch(/^2026-10-06/);
  });

  it('无效输入返回空串', () => {
    expect(formatDateTime('not-a-date')).toBe('');
  });
});

describe('formatChatTime', () => {
  it('当天消息只展示时分', () => {
    const now = new Date();
    expect(formatChatTime(now.getTime())).toMatch(/^\d{2}:\d{2}$/);
  });

  it('跨天消息带月-日', () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    expect(formatChatTime(yesterday)).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
