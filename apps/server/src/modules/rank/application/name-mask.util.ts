/**
 * 榜单展示名脱敏：保留首尾字符，中间以 * 代替；
 * 过短（≤2 字符）只保留首字符，空名回退「匿名玩家」。
 */
export function maskDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '匿名玩家';
  }
  const chars = Array.from(trimmed);
  if (chars.length <= 2) {
    return `${chars[0]}*`;
  }
  return `${chars[0]}${'*'.repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}
