import { extname } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 生成存储对象 key：按日期分目录 + uuid，避免同名覆盖且便于归档。
 * 例：2026/06/26/3f9c1e2a-....png
 */
export function buildObjectKey(originalName: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const ext = extname(originalName).toLowerCase();
  return `${yyyy}/${mm}/${dd}/${uuidv4()}${ext}`;
}
