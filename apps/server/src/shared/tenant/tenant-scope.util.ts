import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

/**
 * 把当前租户条件合并进 FindOptionsWhere（用于 find/findOne/count 等）。
 * 超管或无上下文时（scopeId 返回 null）原样返回，不做过滤。
 */
export function withTenant<T extends ObjectLiteral>(
  tenant: TenantContextService,
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {},
): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
  const tenantId = tenant.scopeId();
  if (!tenantId) {
    return where;
  }
  const inject = { tenantId } as unknown as FindOptionsWhere<T>;
  if (Array.isArray(where)) {
    const list = where.length > 0 ? where : [{} as FindOptionsWhere<T>];
    return list.map((clause) => ({ ...clause, ...inject }));
  }
  return { ...where, ...inject };
}

/**
 * 给 QueryBuilder 追加当前租户过滤条件。
 * 超管或无上下文时不追加。alias 为查询主表别名。
 */
export function applyTenant<T extends ObjectLiteral>(
  tenant: TenantContextService,
  qb: SelectQueryBuilder<T>,
  alias: string,
): SelectQueryBuilder<T> {
  const tenantId = tenant.scopeId();
  if (tenantId) {
    qb.andWhere(`${alias}.tenantId = :__tenantId`, { __tenantId: tenantId });
  }
  return qb;
}
