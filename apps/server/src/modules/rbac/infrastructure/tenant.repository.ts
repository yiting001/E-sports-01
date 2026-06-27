import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { TenantEntity } from '../domain/tenant.entity';
import { TenantRepository } from '../domain/tenant-repository.interface';

/** 租户仓储 TypeORM 实现（平台级，不做租户过滤） */
@Injectable()
export class TypeormTenantRepository implements TenantRepository {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly repo: Repository<TenantEntity>,
  ) {}

  findById(id: string): Promise<TenantEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<TenantEntity | null> {
    return this.repo.findOne({ where: { code } });
  }

  findByIds(ids: string[]): Promise<TenantEntity[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { id: In(ids) } });
  }

  async existsByCode(code: string): Promise<boolean> {
    return (await this.repo.countBy({ code })) > 0;
  }

  paginate(skip: number, take: number, keyword?: string): Promise<[TenantEntity[], number]> {
    return this.repo.findAndCount({
      where: keyword
        ? [{ code: ILike(`%${keyword}%`) }, { name: ILike(`%${keyword}%`) }]
        : {},
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<TenantEntity>): TenantEntity {
    return this.repo.create(data);
  }

  save(tenant: TenantEntity): Promise<TenantEntity> {
    return this.repo.save(tenant);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
