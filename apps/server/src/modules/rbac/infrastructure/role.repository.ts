import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RoleListQuery } from '@app/contracts';
import { ILike, In, IsNull, Not, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { RESERVED_ROLE_CODES } from '../domain/rbac.constants';
import { Role } from '../domain/role.entity';
import { RoleRepository } from '../domain/role-repository.interface';

/**
 * 根据筛选条件组装角色列表 where 子句（不含租户条件）。
 * keyword 对名称/编码取并，code/kind 与其取交：code 与 kind 同时传入时以 code 精确匹配为准。
 * kind=deleted 只看已软删除行（调用方需同时开启 withDeleted）。
 */
export function buildRoleListWhere(filter: RoleListQuery): FindOptionsWhere<Role>[] {
  const scope: FindOptionsWhere<Role> = {};
  if (filter.kind === 'deleted') {
    scope.deletedAt = Not(IsNull());
  }
  if (filter.code) {
    scope.code = filter.code;
  } else if (filter.kind === 'builtin') {
    scope.code = In([...RESERVED_ROLE_CODES]);
  } else if (filter.kind === 'custom') {
    scope.code = Not(In([...RESERVED_ROLE_CODES]));
  }
  if (!filter.keyword) {
    return [scope];
  }
  const pattern = ILike(`%${filter.keyword}%`);
  if (scope.code !== undefined) {
    return [{ ...scope, name: pattern }];
  }
  return [
    { ...scope, name: pattern },
    { ...scope, code: pattern },
  ];
}

/** 角色仓储 TypeORM 实现。读操作按租户上下文自动过滤；写操作 tenantId 由订阅器回填 */
@Injectable()
export class TypeormRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<Role | null> {
    return this.repo.findOne({
      where: withTenant<Role>(this.tenant, { id }) as FindOptionsWhere<Role>,
      relations: { permissions: true },
    });
  }

  findByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({
      where: withTenant<Role>(this.tenant, { id: In(ids) }) as FindOptionsWhere<Role>,
      relations: { permissions: true },
    });
  }

  findByCode(code: string): Promise<Role | null> {
    return this.repo.findOne({
      where: withTenant<Role>(this.tenant, { code }) as FindOptionsWhere<Role>,
      relations: { permissions: true },
      order: { createdAt: 'ASC' },
    });
  }

  findByCodeForTenant(code: string, tenantId: string): Promise<Role | null> {
    return this.repo.findOne({
      where: { code, tenantId },
      relations: { permissions: true },
      order: { createdAt: 'ASC' },
    });
  }

  async existsByCodeForTenantWithDeleted(code: string, tenantId: string): Promise<boolean> {
    return (await this.repo.count({ where: { code, tenantId }, withDeleted: true })) > 0;
  }

  findDeletedById(id: string): Promise<Role | null> {
    return this.repo.findOne({
      where: withTenant<Role>(this.tenant, {
        id,
        deletedAt: Not(IsNull()),
      }) as FindOptionsWhere<Role>,
      withDeleted: true,
    });
  }

  findAllOutsideTenant(tenantId: string): Promise<Role[]> {
    return this.repo.find({ where: { tenantId: Not(tenantId) }, relations: { permissions: true } });
  }

  async existsByCode(code: string): Promise<boolean> {
    return (
      (await this.repo.countBy(withTenant<Role>(this.tenant, { code }) as FindOptionsWhere<Role>)) >
      0
    );
  }

  paginate(skip: number, take: number, filter: RoleListQuery = {}): Promise<[Role[], number]> {
    return this.repo.findAndCount({
      where: withTenant<Role>(this.tenant, buildRoleListWhere(filter)),
      relations: { permissions: true },
      withDeleted: filter.kind === 'deleted',
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<Role>): Role {
    return this.repo.create(data);
  }

  save(role: Role): Promise<Role> {
    return this.repo.save(role);
  }

  async remove(id: string): Promise<void> {
    await this.repo.softDelete(withTenant<Role>(this.tenant, { id }) as FindOptionsWhere<Role>);
  }

  async restore(id: string): Promise<void> {
    await this.repo.restore(withTenant<Role>(this.tenant, { id }) as FindOptionsWhere<Role>);
  }
}
