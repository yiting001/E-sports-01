import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, type FindOptionsWhere, type Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { applyTenant, withTenant } from '../../../shared/tenant/tenant-scope.util';
import { CategoryEntity } from '../domain/category.entity';
import { CategoryRepository } from '../domain/category-repository.interface';
import { ProductEntity } from '../domain/product.entity';

/** 分类仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormCategoryRepository implements CategoryRepository {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repo: Repository<CategoryEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<CategoryEntity | null> {
    return this.repo.findOne({
      where: withTenant<CategoryEntity>(this.tenant, { id }) as FindOptionsWhere<CategoryEntity>,
    });
  }

  findByIds(ids: string[]): Promise<CategoryEntity[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({
      where: withTenant<CategoryEntity>(this.tenant, { id: In(ids) }),
    });
  }

  paginate(skip: number, take: number): Promise<[CategoryEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<CategoryEntity>(this.tenant, {}),
      order: { sort: 'ASC', createdAt: 'DESC' },
      skip,
      take,
    });
  }

  listEnabled(): Promise<CategoryEntity[]> {
    return this.repo.find({
      where: withTenant<CategoryEntity>(this.tenant, { enabled: true }),
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  async countProducts(categoryIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (categoryIds.length === 0) {
      return result;
    }
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select('p.category_id', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('p.category_id IN (:...ids)', { ids: categoryIds })
      .groupBy('p.category_id');
    const rows = await applyTenant(this.tenant, qb, 'p').getRawMany<{
      categoryId: string;
      count: string;
    }>();
    for (const row of rows) {
      result.set(row.categoryId, Number(row.count));
    }
    return result;
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const base = excludeId ? { name, id: Not(excludeId) } : { name };
    const count = await this.repo.count({
      where: withTenant<CategoryEntity>(this.tenant, base),
    });
    return count > 0;
  }

  create(data: Partial<CategoryEntity>): CategoryEntity {
    return this.repo.create(data);
  }

  save(entity: CategoryEntity): Promise<CategoryEntity> {
    return this.repo.save(entity);
  }

  async remove(entity: CategoryEntity): Promise<void> {
    await this.repo.remove(entity);
  }
}
