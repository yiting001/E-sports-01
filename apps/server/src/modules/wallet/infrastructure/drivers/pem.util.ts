/**
 * PEM 归一化工具。
 * 配置中心以单行文本保存证书时，粘贴内容的换行会丢失，导致底层
 * 解析器报「pem: invalid END line」。此处按 PEM 规范重建格式：
 * BEGIN/END 独占一行、正文 base64 每 64 字符换行，支持证书链（多段）。
 */

const PEM_BLOCK = /-----BEGIN ([A-Z0-9 ]+)-----([A-Za-z0-9+/=\s]+?)-----END \1-----/g;

/** 将任意粘贴形态（单行/带字面 \n/多段链）的 PEM 文本归一化为标准格式 */
export function normalizePem(raw: string): string {
  const text = raw.replace(/\\n/g, '\n').trim();
  const blocks: string[] = [];
  for (const match of text.matchAll(PEM_BLOCK)) {
    const label = match[1];
    const body = match[2].replace(/\s+/g, '');
    const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? '';
    blocks.push(`-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`);
  }
  return blocks.length > 0 ? blocks.join('\n') : text;
}
