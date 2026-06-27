import { TenantEntity } from './tenant.entity';

/** 租户仓储注入令牌 */
export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');

/** 租户仓储（平台级，不做行级过滤） */
export interface TenantRepository {
  findById(id: string): Promise<TenantEntity | null>;
  findByCode(code: string): Promise<TenantEntity | null>;
  findByIds(ids: string[]): Promise<TenantEntity[]>;
  existsByCode(code: string): Promise<boolean>;
  paginate(skip: number, take: number, keyword?: string): Promise<[TenantEntity[], number]>;
  create(data: Partial<TenantEntity>): TenantEntity;
  save(tenant: TenantEntity): Promise<TenantEntity>;
  remove(id: string): Promise<void>;
}
