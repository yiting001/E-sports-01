import { Inject, Injectable } from '@nestjs/common';
import { AdminOrderView, PaginatedResult } from '@app/contracts';
import {
  AdminOrderFilter,
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { toAdminOrderView } from '../order.mapper';

/** 用例：管理端分页检索订单（可按状态/订单号过滤），按创建时间倒序 */
@Injectable()
export class ListAdminOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    filter: AdminOrderFilter,
  ): Promise<PaginatedResult<AdminOrderView>> {
    const [rows, total] = await this.orders.paginateAdmin(
      skip,
      pageSize,
      filter,
    );
    return { list: rows.map(toAdminOrderView), total, page, pageSize };
  }
}
