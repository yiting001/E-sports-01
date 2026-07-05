import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';
import { OrderModule } from '../order/order.module';

import { ReviewEntity } from './domain/review.entity';
import { REVIEW_REPOSITORY } from './domain/review-repository.interface';

import { TypeormReviewRepository } from './infrastructure/review.repository';

import { SubmitReviewUseCase } from './application/use-cases/submit-review.usecase';
import { ListProductReviewsUseCase } from './application/use-cases/list-product-reviews.usecase';
import { ListReviewedOrdersUseCase } from './application/use-cases/list-reviewed-orders.usecase';
import { ListAdminReviewsUseCase } from './application/use-cases/list-admin-reviews.usecase';
import { SetReviewVisibilityUseCase } from './application/use-cases/set-review-visibility.usecase';
import { RemoveReviewUseCase } from './application/use-cases/remove-review.usecase';

import { ReviewSubmitController } from './interfaces/controllers/review.submit.controller';
import { ReviewPublicListController } from './interfaces/controllers/review.public-list.controller';
import { ReviewMineReviewedController } from './interfaces/controllers/review.mine.reviewed.controller';
import { ReviewAdminListController } from './interfaces/controllers/review.admin.list.controller';
import { ReviewVisibilityController } from './interfaces/controllers/review.visibility.controller';
import { ReviewRemoveController } from './interfaces/controllers/review.remove.controller';

/**
 * 商品评论模块。
 * DDD 四层装配：用户对本人已完成订单发表评分 + 评论（一单一评），
 * 商品详情页免登录展示可见评论与平均分；管理端检索/隐藏/恢复/删除评论。
 * 订单校验复用 OrderModule 导出的仓储端口，不重复实现订单查询。
 * 注意控制器注册顺序：静态路由（public/mine）在参数路由（:id）之前。
 */
@Module({
  imports: [RbacModule, OrderModule, TypeOrmModule.forFeature([ReviewEntity])],
  controllers: [
    ReviewPublicListController,
    ReviewMineReviewedController,
    ReviewSubmitController,
    ReviewAdminListController,
    ReviewVisibilityController,
    ReviewRemoveController,
  ],
  providers: [
    { provide: REVIEW_REPOSITORY, useClass: TypeormReviewRepository },
    SubmitReviewUseCase,
    ListProductReviewsUseCase,
    ListReviewedOrdersUseCase,
    ListAdminReviewsUseCase,
    SetReviewVisibilityUseCase,
    RemoveReviewUseCase,
  ],
})
export class ReviewModule {}
