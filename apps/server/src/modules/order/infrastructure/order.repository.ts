import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { OrderEntity } from '../domain/order.entity';
import { OrderRepository } from '../domain/order-repository.interface';

/** 订单仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repo: Repository<OrderEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<OrderEntity | null> {
    return this.repo.findOne({
      where: withTenant<OrderEntity>(this.tenant, { id }) as FindOptionsWhere<OrderEntity>,
    });
  }

  findByOrderNo(orderNo: string): Promise<OrderEntity | null> {
    return this.repo.findOne({
      where: withTenant<OrderEntity>(this.tenant, {
        orderNo,
      }) as FindOptionsWhere<OrderEntity>,
    });
  }

  paginateByUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[OrderEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<OrderEntity>(this.tenant, { userId }),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<OrderEntity>): OrderEntity {
    return this.repo.create(data);
  }

  save(entity: OrderEntity): Promise<OrderEntity> {
    return this.repo.save(entity);
  }
}
