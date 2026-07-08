import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type FindOptionsWhere, type Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import {
  applyTenant,
  withTenant,
} from '../../../shared/tenant/tenant-scope.util';
import { ReviewEntity } from '../domain/review.entity';
import {
  AdminReviewFilter,
  ReviewRepository,
} from '../domain/review-repository.interface';

/** 评论仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormReviewRepository implements ReviewRepository {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly repo: Repository<ReviewEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<ReviewEntity | null> {
    return this.repo.findOne({
      where: withTenant<ReviewEntity>(this.tenant, {
        id,
      }) as FindOptionsWhere<ReviewEntity>,
    });
  }

  findByOrderId(orderId: string): Promise<ReviewEntity | null> {
    return this.repo.findOne({
      where: withTenant<ReviewEntity>(this.tenant, { orderId }),
    });
  }

  async findReviewedOrderIds(
    userId: string,
    orderIds: string[],
  ): Promise<string[]> {
    if (orderIds.length === 0) {
      return [];
    }
    const rows = await this.repo.find({
      where: withTenant<ReviewEntity>(this.tenant, {
        userId,
        orderId: In(orderIds),
      }),
      select: { orderId: true },
    });
    return rows.map((row) => row.orderId).filter((id): id is string => Boolean(id));
  }

  paginateVisibleByProduct(
    productId: string,
    skip: number,
    take: number,
  ): Promise<[ReviewEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<ReviewEntity>(this.tenant, {
        productId,
        visible: true,
      }),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async avgRatingByProduct(productId: string): Promise<number | null> {
    const qb = this.repo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.productId = :productId', { productId })
      .andWhere('review.visible = TRUE');
    const raw = await applyTenant(this.tenant, qb, 'review').getRawOne<{
      avg: string | null;
    }>();
    return raw?.avg == null ? null : Number(raw.avg);
  }

  paginateAdmin(
    skip: number,
    take: number,
    filter: AdminReviewFilter,
  ): Promise<[ReviewEntity[], number]> {
    const base = {
      ...(filter.rating !== undefined ? { rating: filter.rating } : {}),
      ...(filter.visible !== undefined ? { visible: filter.visible } : {}),
    };
    return this.repo.findAndCount({
      where: withTenant<ReviewEntity>(this.tenant, base),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<ReviewEntity>): ReviewEntity {
    return this.repo.create(data);
  }

  save(entity: ReviewEntity): Promise<ReviewEntity> {
    return this.repo.save(entity);
  }

  async remove(entity: ReviewEntity): Promise<void> {
    await this.repo.remove(entity);
  }
}
