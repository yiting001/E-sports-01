import { Inject, Injectable } from '@nestjs/common';
import { OrderStatus, OrderView, PaginatedResult } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterAccess } from '../booster-access.service';
import { toOrderView } from '../order.mapper';

/** 用例：打手分页查询自己接下的订单（可按状态过滤），按创建时间倒序 */
@Injectable()
export class ListBoosterOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly boosterAccess: BoosterAccess,
  ) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
    skip: number,
    status?: OrderStatus,
  ): Promise<PaginatedResult<OrderView>> {
    await this.boosterAccess.assert(userId);
    const [rows, total] = await this.orders.paginateByBooster(
      userId,
      skip,
      pageSize,
      status,
    );
    return { list: rows.map(toOrderView), total, page, pageSize };
  }
}
