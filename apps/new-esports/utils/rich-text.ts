/**
 * 富文本净化（临时措施，纯函数，可单测）。
 *
 * 背景：小程序端 <rich-text> 只渲染白名单标签、不执行脚本，天然安全；
 * 但 H5 端 rich-text 会以 innerHTML 方式渲染，需要在渲染前剔除脚本类内容。
 * apps/client 用 DOMPurify 完整净化；本工程当前无依赖，这里只做最小剔除，
 * 接上 pnpm workspace / 依赖后应替换为 DOMPurify。
 */

const DANGEROUS_BLOCKS =
  /<(script|style|iframe|object|embed|link|meta|base|form)\b[\s\S]*?(<\/\1\s*>|$)/gi;
const DANGEROUS_ATTRS = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
/** 三种引号形态都要吃掉整段属性值，否则会残留引号（如 href="#"">） */
const DANGEROUS_URLS =
  /(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]*)/gi;

export function sanitizeRichHtml(html: string): string {
  const source = html ?? '';
  if (!source) {
    return '';
  }
  return source
    .replace(DANGEROUS_BLOCKS, '')
    .replace(DANGEROUS_ATTRS, '')
    .replace(DANGEROUS_URLS, '$1="#"');
}
