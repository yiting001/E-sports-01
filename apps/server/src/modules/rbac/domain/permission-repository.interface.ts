import { Permission } from './permission.entity';

export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');

/** 权限仓储接口 */
export interface PermissionRepository {
  findAll(): Promise<Permission[]>;
  findById(id: string): Promise<Permission | null>;
  findByIds(ids: string[]): Promise<Permission[]>;
  findByCode(code: string): Promise<Permission | null>;
  existsByCode(code: string): Promise<boolean>;
  create(data: Partial<Permission>): Permission;
  save(permission: Permission): Promise<Permission>;
  createMissing(items: Array<Partial<Permission> & { code: string }>): Promise<number>;
  remove(id: string): Promise<void>;
}
