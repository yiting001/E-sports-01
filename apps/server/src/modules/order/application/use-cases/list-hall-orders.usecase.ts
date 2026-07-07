import { Inject, Injectable } from '@nestjs/common';
import { OrderView, PaginatedResult } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterAccess } from '../booster-access.service';
import { toHallOrderView } from '../order.mapper';

/** 用例：打手分页浏览接单大厅（状态为待接单的订单），按创建时间倒序 */
@Injectable()
export class ListHallOrdersUseCase {
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
  ): Promise<PaginatedResult<OrderView>> {
    await this.boosterAccess.assert(userId);
    const [rows, total] = await this.orders.paginateDispatching(skip, pageSize);
    return { list: rows.map(toHallOrderView), total, page, pageSize };
  }
}
