import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { Role } from '../domain/role.entity';
import { RoleRepository } from '../domain/role-repository.interface';

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
    });
  }

  async existsByCode(code: string): Promise<boolean> {
    return (
      (await this.repo.countBy(
        withTenant<Role>(this.tenant, { code }) as FindOptionsWhere<Role>,
      )) > 0
    );
  }

  paginate(skip: number, take: number, keyword?: string): Promise<[Role[], number]> {
    const keywordClauses: FindOptionsWhere<Role>[] = keyword
      ? [{ name: ILike(`%${keyword}%`) }, { code: ILike(`%${keyword}%`) }]
      : [{}];
    return this.repo.findAndCount({
      where: withTenant<Role>(this.tenant, keywordClauses),
      relations: { permissions: true },
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
    await this.repo.delete(
      withTenant<Role>(this.tenant, { id }) as FindOptionsWhere<Role>,
    );
  }
}
