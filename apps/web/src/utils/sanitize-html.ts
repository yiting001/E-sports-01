import DOMPurify from 'dompurify';

/**
 * 富文本 HTML 净化。
 * 富文本配置（如客服欢迎语）以 HTML 存储，渲染前统一净化以防 XSS；
 * 放行图片/视频展示所需的标签与属性，过滤脚本与事件处理器。
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['video', 'source'],
    ADD_ATTR: ['controls', 'poster', 'type'],
  });
}
