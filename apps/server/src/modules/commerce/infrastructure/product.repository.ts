import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, type FindOptionsWhere, type Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { ProductEntity } from '../domain/product.entity';
import {
  ProductFilter,
  ProductRepository,
} from '../domain/product-repository.interface';

/** 商品仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<ProductEntity | null> {
    return this.repo.findOne({
      where: withTenant<ProductEntity>(this.tenant, { id }) as FindOptionsWhere<ProductEntity>,
    });
  }

  paginate(
    skip: number,
    take: number,
    filter: ProductFilter,
  ): Promise<[ProductEntity[], number]> {
    const base: FindOptionsWhere<ProductEntity> = {};
    if (filter.categoryId) {
      base.categoryId = filter.categoryId;
    }
    if (filter.status) {
      base.status = filter.status;
    }
    if (filter.keyword) {
      base.title = ILike(`%${filter.keyword}%`);
    }
    return this.repo.findAndCount({
      where: withTenant<ProductEntity>(this.tenant, base),
      order: { sort: 'ASC', createdAt: 'DESC' },
      skip,
      take,
    });
  }

  countByCategory(categoryId: string): Promise<number> {
    return this.repo.count({
      where: withTenant<ProductEntity>(this.tenant, { categoryId }),
    });
  }

  create(data: Partial<ProductEntity>): ProductEntity {
    return this.repo.create(data);
  }

  save(entity: ProductEntity): Promise<ProductEntity> {
    return this.repo.save(entity);
  }

  async remove(entity: ProductEntity): Promise<void> {
    await this.repo.remove(entity);
  }
}
