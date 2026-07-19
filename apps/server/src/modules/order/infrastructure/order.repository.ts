import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { OrderStatus } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { OrderEntity } from '../domain/order.entity';
import {
  AdminOrderFilter,
  ClaimOrderForServingInput,
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

  paginateDispatching(skip: number, take: number): Promise<[OrderEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<OrderEntity>(this.tenant, {
        status: OrderStatus.Dispatching,
      }),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  paginateByBooster(
    boosterId: string,
    skip: number,
    take: number,
    status?: OrderStatus,
  ): Promise<[OrderEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<OrderEntity>(this.tenant, {
        boosterId,
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
    if (filter.serviceAgentId) {
      where.serviceAgentId = filter.serviceAgentId;
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

  claimForServing(input: ClaimOrderForServingInput): Promise<OrderEntity | null> {
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(OrderEntity);
      const order = await repo.findOne({
        where: { id: input.orderId, tenantId: input.tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !order ||
        !input.allowedStatuses.includes(order.status) ||
        order.boosterId ||
        order.userId === input.boosterId ||
        order.requestedBoosterId !== input.expectedRequestedBoosterId ||
        (order.requestedBoosterId && order.requestedBoosterId !== input.boosterId)
      ) {
        return null;
      }
      order.status = OrderStatus.Serving;
      order.boosterId = input.boosterId;
      order.boosterName = input.boosterName;
      order.acceptedAt = input.acceptedAt;
      return repo.save(order);
    });
  }
}
