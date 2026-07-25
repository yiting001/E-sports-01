import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { OrderStatus } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { applyTenant, withTenant } from '../../../shared/tenant/tenant-scope.util';
import { OrderEntity } from '../domain/order.entity';
import {
  AdminOrderFilter,
  ClaimOrderForCancellationInput,
  ClaimOrderForDispatchInput,
  ClaimOrderForServingInput,
  HallOrderFilter,
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
      relations: { refund: true },
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
      relations: { refund: true },
      skip,
      take,
    });
  }

  paginateDispatching(
    skip: number,
    take: number,
    filter: HallOrderFilter = {},
  ): Promise<[OrderEntity[], number]> {
    const query = this.repo
      .createQueryBuilder('serviceOrder')
      .leftJoinAndSelect('serviceOrder.refund', 'refund')
      .where('serviceOrder.status = :status', { status: OrderStatus.Dispatching })
      .orderBy('serviceOrder.dispatchedAt', 'DESC')
      .addOrderBy('serviceOrder.createdAt', 'DESC')
      .skip(skip)
      .take(take);
    applyTenant(this.tenant, query, 'serviceOrder');

    if (filter.serviceRegion) {
      query.andWhere('serviceOrder.serviceRegion = :serviceRegion', {
        serviceRegion: filter.serviceRegion,
      });
    }
    const keyword = filter.keyword?.trim();
    if (keyword) {
      query.andWhere(
        '(serviceOrder.orderNo ILIKE :keyword OR serviceOrder.productTitle ILIKE :keyword)',
        { keyword: `%${this.escapeLike(keyword)}%` },
      );
    }

    return query.getManyAndCount();
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
      relations: { refund: true },
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

  async updateConversationId(id: string, conversationId: string): Promise<void> {
    const scope = withTenant<OrderEntity>(this.tenant, { id }) as FindOptionsWhere<OrderEntity>;
    const result = await this.repo.update(scope, { conversationId });
    if (result.affected !== 1) {
      throw new Error(`订单 ${id} 的群聊关联回填失败`);
    }
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
  }

  claimForDispatch(input: ClaimOrderForDispatchInput): Promise<OrderEntity | null> {
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(OrderEntity);
      const order = await repo.findOne({
        where: { id: input.orderId, tenantId: input.tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !order ||
        order.status !== OrderStatus.PendingService ||
        order.boosterId ||
        order.requestedBoosterId
      ) {
        return null;
      }
      order.status = OrderStatus.Dispatching;
      order.dispatchedAt = input.dispatchedAt;
      return repo.save(order);
    });
  }

  claimForCancellation(input: ClaimOrderForCancellationInput): Promise<OrderEntity | null> {
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(OrderEntity);
      const order = await repo.findOne({
        where: { id: input.orderId, tenantId: input.tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order || order.userId !== input.userId || order.status !== OrderStatus.PendingPayment) {
        return null;
      }
      order.status = OrderStatus.Cancelled;
      order.cancelledAt = input.cancelledAt;
      return repo.save(order);
    });
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
