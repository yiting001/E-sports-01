import { Inject, Injectable } from '@nestjs/common';
import { OrderView, PaginatedResult } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { toOrderView } from '../order.mapper';

/** 用例：分页查询我的订单，按创建时间倒序 */
@Injectable()
export class ListMyOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
  ) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<OrderView>> {
    const [rows, total] = await this.orders.paginateByUser(
      userId,
      skip,
      pageSize,
    );
    return { list: rows.map(toOrderView), total, page, pageSize };
  }
}
