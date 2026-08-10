import { Inject, Injectable } from '@nestjs/common';
import { OrderView, PaginatedResult } from '@app/contracts';
import {
  HallOrderFilter,
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../../commerce/domain/product-repository.interface';
import { BoosterProgressService } from '../../../booster/application/booster-progress.service';
import { BoosterAccess } from '../booster-access.service';
import { toHallOrderView } from '../order.mapper';

/** 用例：打手筛选待接单大厅，按下发时间倒序返回安全订单投影。 */
@Injectable()
export class ListHallOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
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
    const coverSubs = await this.loadCoverSubs(rows.map((row) => row.productId));
    return {
      list: rows.map((row) =>
        toHallOrderView(
          row,
          tier.commissionRateBp,
          coverSubs.get(row.productId) ?? '',
        ),
      ),
      total,
      page,
      pageSize,
    };
  }

  /** 按去重商品 id 批量取封面副标语；商品被删除时回退空串不影响列表。 */
  private async loadCoverSubs(
    productIds: string[],
  ): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(productIds)];
    const entries = await Promise.all(
      uniqueIds.map(async (id) => {
        const product = await this.products.findById(id);
        return [id, product?.coverSub ?? ''] as const;
      }),
    );
    return new Map(entries);
  }
}
