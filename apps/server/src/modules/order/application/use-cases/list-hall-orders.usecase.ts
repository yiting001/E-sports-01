import { Inject, Injectable } from '@nestjs/common';
import { OrderView, PaginatedResult } from '@app/contracts';
import {
  HallOrderFilter,
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterProgressService } from '../../../booster/application/booster-progress.service';
import { BoosterAccess } from '../booster-access.service';
import { toHallOrderView } from '../order.mapper';

/** 用例：打手筛选待接单大厅，按下发时间倒序返回安全订单投影。 */
@Injectable()
export class ListHallOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly boosterAccess: BoosterAccess,
    private readonly boosterProgress: BoosterProgressService,
  ) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
    skip: number,
    filter: HallOrderFilter = {},
  ): Promise<PaginatedResult<OrderView>> {
    await this.boosterAccess.assert(userId);
    const [[rows, total], tier] = await Promise.all([
      this.orders.paginateDispatching(skip, pageSize, filter),
      this.boosterProgress.currentTier(userId),
    ]);
    return {
      list: rows.map((row) => toHallOrderView(row, tier.commissionRateBp)),
      total,
      page,
      pageSize,
    };
  }
}
