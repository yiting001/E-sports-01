import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import type { OrderStatus } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { OrderEntity } from '../domain/order.entity';
import {
  AdminOrderFilter,
  OrderRepository,
} from '../domain/order-repository.interface';

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
    status?: OrderStatus,
  ): Promise<[OrderEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<OrderEntity>(this.tenant, {
        userId,
        ...(status ? { status } : {}),
      }),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  paginateAdmin(
    skip: number,
    take: number,
    filter: AdminOrderFilter,
  ): Promise<[OrderEntity[], number]> {
    const where: FindOptionsWhere<OrderEntity> = {};
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.orderNo) {
      where.orderNo = filter.orderNo;
    }
    return this.repo.findAndCount({
      where: withTenant<OrderEntity>(this.tenant, where),
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
