import { Controller, Get, Query } from '@nestjs/common';
import { ListReviewedOrdersUseCase } from '../../application/use-cases/list-reviewed-orders.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ReviewedOrdersQueryDto } from '../dto/reviewed-orders-query.dto';

/**
 * 路由：查询本人已评价的订单 id（GET /review/mine/reviewed?orderIds=a,b）。
 * 仅登录态；我的订单页据此把「评价」按钮切换为「已评价」。
 */
@Controller('review')
export class ReviewMineReviewedController {
  constructor(private readonly useCase: ListReviewedOrdersUseCase) {}

  @Get('mine/reviewed')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ReviewedOrdersQueryDto,
  ): Promise<string[]> {
    return this.useCase.execute(user.id, query.orderIds);
  }
}
