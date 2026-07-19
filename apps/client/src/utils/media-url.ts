import { ENV } from '@/config/env';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * 将相对上传路径和历史本机绝对地址转换为当前公开后端地址。
 * OSS 等正常外部 URL 保持不变，避免远端设备请求自己的 127.0.0.1。
 */
export function resolveMediaUrl(value: string): string {
  const source = value.trim();
  if (!source) {
    return '';
  }

  try {
    const browserOrigin = window.location.origin;
    const apiOrigin = new URL(ENV.apiBaseUrl || '/api', browserOrigin).origin;
    const parsed = new URL(source, browserOrigin);
    if (source.startsWith('/') || LOOPBACK_HOSTS.has(parsed.hostname)) {
      return `${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    return source;
  }
}

const RICH_MEDIA_ATTRIBUTES = [
  ['img[src]', 'src'],
  ['video[src]', 'src'],
  ['video[poster]', 'poster'],
  ['audio[src]', 'src'],
  ['source[src]', 'src'],
] as const;

/** 将已净化富文本中的媒体地址统一转换为当前公开后端地址。 */
export function resolveRichMediaUrls(html: string): string {
  if (!html.trim()) {
    return '';
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  for (const [selector, attribute] of RICH_MEDIA_ATTRIBUTES) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      const value = element.getAttribute(attribute);
      if (value) {
        element.setAttribute(attribute, resolveMediaUrl(value));
      }
    });
  }
  return document.body.innerHTML;
}
