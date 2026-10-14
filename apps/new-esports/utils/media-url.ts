import { ENV } from '@/config/env';

/**
 * 媒体地址改写（纯函数，可单测）。
 * 配置中心与商品数据里存在两类非公开地址：相对路径（/static/...）与历史本机绝对地址
 * （http://127.0.0.1:3000/static/...）。真机渲染时必须改写为当前后端 origin，
 * 否则图片会指向上传时的本机地址而加载失败；OSS 等公网地址原样返回。
 */

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/** 当前后端 origin（不含 /api 前缀） */
function apiOrigin(): string {
  const matched = ENV.apiBaseUrl.match(/^https?:\/\/[^/]+/);
  return matched ? matched[0] : '';
}

export function resolveMediaUrl(value: string): string {
  const source = (value ?? '').trim();
  if (!source) {
    return '';
  }
  if (source.startsWith('/')) {
    return `${apiOrigin()}${source}`;
  }
  const matched = source.match(/^(https?):\/\/([^/:]+)(?::(\d+))?(\/.*)?$/i);
  if (!matched) {
    return source;
  }
  const host = matched[2]?.toLowerCase() ?? '';
  if (!LOOPBACK_HOSTS.has(host)) {
    return source;
  }
  return `${apiOrigin()}${matched[4] ?? '/'}`;
}
