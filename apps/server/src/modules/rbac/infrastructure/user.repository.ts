import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Not, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user-repository.interface';

/** 用户仓储 TypeORM 实现。读操作按租户上下文自动过滤；写操作 tenantId 由订阅器回填 */
@Injectable()
export class TypeormUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly tenant: TenantContextService,
  ) {}

  /** 计算生效租户 id：显式传入优先，否则取当前请求上下文（超管/无上下文为 null） */
  private effectiveTenantId(explicit?: string): string | null {
    return explicit ?? this.tenant.scopeId();
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: withTenant<User>(this.tenant, { id }) as FindOptionsWhere<User>,
      relations: { roles: true },
    });
  }

  findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({
      where: withTenant<User>(this.tenant, { id: In(ids) }) as FindOptionsWhere<User>,
    });
  }

  findByUsernameWithPassword(username: string, tenantId?: string): Promise<User | null> {
    const qb = this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.username = :username', { username });
    const tid = this.effectiveTenantId(tenantId);
    if (tid) {
      qb.andWhere('user.tenantId = :tid', { tid });
    }
    return qb.getOne();
  }

  findByAccountWithPassword(account: string, tenantId?: string): Promise<User | null> {
    const qb = this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where('(user.username = :account OR user.phone = :account)', { account });
    const tid = this.effectiveTenantId(tenantId);
    if (tid) {
      qb.andWhere('user.tenantId = :tid', { tid });
    }
    return qb.getOne();
  }

  findByPhone(phone: string, tenantId?: string): Promise<User | null> {
    const tid = this.effectiveTenantId(tenantId);
    const where: FindOptionsWhere<User> = tid ? { phone, tenantId: tid } : { phone };
    return this.repo.findOne({ where, relations: { roles: true } });
  }

  async existsByUsername(username: string, tenantId?: string): Promise<boolean> {
    const tid = this.effectiveTenantId(tenantId);
    const where: FindOptionsWhere<User> = tid ? { username, tenantId: tid } : { username };
    return (await this.repo.countBy(where)) > 0;
  }

  async existsByPhone(phone: string, excludeUserId?: string, tenantId?: string): Promise<boolean> {
    const tid = this.effectiveTenantId(tenantId);
    const base: FindOptionsWhere<User> = excludeUserId
      ? { phone, id: Not(excludeUserId) }
      : { phone };
    const where: FindOptionsWhere<User> = tid ? { ...base, tenantId: tid } : base;
    return (await this.repo.countBy(where)) > 0;
  }

  paginate(skip: number, take: number, keyword?: string): Promise<[User[], number]> {
    const keywordClauses: FindOptionsWhere<User>[] = keyword
      ? [{ username: ILike(`%${keyword}%`) }, { nickname: ILike(`%${keyword}%`) }]
      : [{}];
    return this.repo.findAndCount({
      where: withTenant<User>(this.tenant, keywordClauses),
      relations: { roles: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(
      withTenant<User>(this.tenant, { id }) as FindOptionsWhere<User>,
    );
  }
}
