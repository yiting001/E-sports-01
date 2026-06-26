import { Role } from './role.entity';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

/** 角色仓储接口 */
export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByIds(ids: string[]): Promise<Role[]>;
  findByCode(code: string): Promise<Role | null>;
  existsByCode(code: string): Promise<boolean>;
  paginate(skip: number, take: number, keyword?: string): Promise<[Role[], number]>;
  create(data: Partial<Role>): Role;
  save(role: Role): Promise<Role>;
  remove(id: string): Promise<void>;
}
