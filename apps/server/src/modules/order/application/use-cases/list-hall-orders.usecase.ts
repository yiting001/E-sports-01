import { Inject, Injectable } from '@nestjs/common';
import { OrderView, PaginatedResult } from '@app/contracts';
import {
  HallOrderFilter,
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterAccess } from '../booster-access.service';
import { toHallOrderView } from '../order.mapper';

/** 用例：打手筛选待接单大厅，按下发时间倒序返回安全订单投影。 */
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
    filter: HallOrderFilter = {},
  ): Promise<PaginatedResult<OrderView>> {
    await this.boosterAccess.assert(userId);
    const [rows, total] = await this.orders.paginateDispatching(skip, pageSize, filter);
    return { list: rows.map(toHallOrderView), total, page, pageSize };
  }
}
