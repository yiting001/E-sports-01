import type { RoleListQuery } from '@app/contracts';
import { Role } from './role.entity';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

/** 角色仓储接口 */
export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByIds(ids: string[]): Promise<Role[]>;
  findByCode(code: string): Promise<Role | null>;
  /** 启动播种和跨租户平台流程用：显式限定租户查询角色。 */
  findByCodeForTenant(code: string, tenantId: string): Promise<Role | null>;
  /** 启动播种用：含已软删除行判断编码是否存在，避免复活管理员已删除的内置角色。 */
  existsByCodeForTenantWithDeleted(code: string, tenantId: string): Promise<boolean>;
  /** 查询已软删除的角色（受当前租户作用域限制）。 */
  findDeletedById(id: string): Promise<Role | null>;
  /** 启动播种用：查询指定租户之外的全部角色（含权限）。 */
  findAllOutsideTenant(tenantId: string): Promise<Role[]>;
  existsByCode(code: string): Promise<boolean>;
  /** 分页查询：keyword 模糊匹配名称/编码，code 精确匹配，kind 按内置/自定义/已删除分类。 */
  paginate(skip: number, take: number, filter?: RoleListQuery): Promise<[Role[], number]>;
  create(data: Partial<Role>): Role;
  save(role: Role): Promise<Role>;
  /** 软删除：只标记 deletedAt，不动用户-角色、角色-权限关联行。 */
  remove(id: string): Promise<void>;
  /** 恢复软删除的角色。 */
  restore(id: string): Promise<void>;
}
