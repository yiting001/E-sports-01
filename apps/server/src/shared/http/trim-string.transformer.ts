import type { TransformFnParams } from 'class-transformer';

/** 在 DTO 校验前去除字符串首尾空白，非字符串交由后续 validator 拒绝。 */
export function trimStringValue({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
