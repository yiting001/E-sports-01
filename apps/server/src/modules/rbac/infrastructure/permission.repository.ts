import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../domain/permission.entity';
import { PermissionRepository } from '../domain/permission-repository.interface';

/** 权限仓储 TypeORM 实现 */
@Injectable()
export class TypeormPermissionRepository implements PermissionRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {}

  findAll(): Promise<Permission[]> {
    return this.repo.find({ order: { sort: 'ASC', createdAt: 'ASC' } });
  }

  findById(id: string): Promise<Permission | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Permission[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { id: In(ids) } });
  }

  findByCode(code: string): Promise<Permission | null> {
    return this.repo.findOne({ where: { code } });
  }

  async existsByCode(code: string): Promise<boolean> {
    return (await this.repo.countBy({ code })) > 0;
  }

  create(data: Partial<Permission>): Permission {
    return this.repo.create(data);
  }

  save(permission: Permission): Promise<Permission> {
    return this.repo.save(permission);
  }

  async createMissing(items: Array<Partial<Permission> & { code: string }>): Promise<number> {
    const existing = await this.repo.find({ select: { code: true } });
    const existingCodes = new Set(existing.map((it) => it.code));
    const toCreate = items.filter((it) => !existingCodes.has(it.code));
    if (toCreate.length === 0) {
      return 0;
    }
    await this.repo.save(toCreate.map((it) => this.repo.create(it)));
    return toCreate.length;
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
