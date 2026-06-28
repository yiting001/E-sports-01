import type { ValueTransformer } from 'typeorm';

/**
 * BIGINT ↔ number 列转换器。
 * PostgreSQL 的 bigint 经驱动默认以字符串读出，金额列统一经此转回数值，
 * 避免业务层各处手写 Number() 转换，保证「分」始终以整数参与运算。
 */
export const bigintTransformer: ValueTransformer = {
  to(value: number | null): number | null {
    return value;
  },
  from(value: string | null): number {
    return value === null ? 0 : Number(value);
  },
};
