import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';
import { CommerceModule } from '../commerce/commerce.module';
import { WalletModule } from '../wallet/wallet.module';
import { BoosterModule } from '../booster/booster.module';
import { MemberModule } from '../member/member.module';
import { CouponModule } from '../coupon/coupon.module';
import { ImModule } from '../im/im.module';

import { OrderEntity } from './domain/order.entity';
import { ORDER_REPOSITORY } from './domain/order-repository.interface';
import { TypeormOrderRepository } from './infrastructure/order.repository';

import { CreateOrderUseCase } from './application/use-cases/create-order.usecase';
import { HandleOrderCallbackUseCase } from './application/use-cases/handle-order-callback.usecase';
import { GetMyOrderUseCase } from './application/use-cases/get-my-order.usecase';
import { QueryOrderPaymentUseCase } from './application/use-cases/query-order-payment.usecase';
import { OrderPaymentSettleService } from './application/order-payment.service';
import { ListMyOrdersUseCase } from './application/use-cases/list-my-orders.usecase';
import { CancelMyOrderUseCase } from './application/use-cases/cancel-my-order.usecase';
import { ListAdminOrdersUseCase } from './application/use-cases/list-admin-orders.usecase';
import { GetAdminOrderUseCase } from './application/use-cases/get-admin-order.usecase';
import { DispatchOrderUseCase } from './application/use-cases/dispatch-order.usecase';
import { ListHallOrdersUseCase } from './application/use-cases/list-hall-orders.usecase';
import { AcceptHallOrderUseCase } from './application/use-cases/accept-hall-order.usecase';
import { ListBoosterOrdersUseCase } from './application/use-cases/list-booster-orders.usecase';
import { CompleteBoosterOrderUseCase } from './application/use-cases/complete-booster-order.usecase';
import { BoosterAccess } from './application/booster-access.service';
import { OrderGroupService } from './application/order-group.service';
import { ServiceAgentScope } from './application/service-agent-scope.service';
import { AssignOrderBoosterUseCase } from './application/use-cases/assign-order-booster.usecase';
import { ListBoosterCandidatesUseCase } from './application/use-cases/list-booster-candidates.usecase';
import { JoinOrderGroupUseCase } from './application/use-cases/join-order-group.usecase';

import { OrderCreateController } from './interfaces/controllers/order.create.controller';
import { OrderCallbackController } from './interfaces/controllers/order.callback.controller';
import { OrderMineListController } from './interfaces/controllers/order.mine.list.controller';
import { OrderMineDetailController } from './interfaces/controllers/order.mine.detail.controller';
import { OrderPayQueryController } from './interfaces/controllers/order.pay.query.controller';
import { OrderCancelController } from './interfaces/controllers/order.cancel.controller';
import { OrderAdminListController } from './interfaces/controllers/order.admin.list.controller';
import { OrderAdminDetailController } from './interfaces/controllers/order.admin.detail.controller';
import { OrderAdminGroupJoinController } from './interfaces/controllers/order.admin.group-join.controller';
import { OrderAdminDispatchController } from './interfaces/controllers/order.admin.dispatch.controller';
import { OrderAdminAssignController } from './interfaces/controllers/order.admin.assign.controller';
import { OrderAdminBoosterCandidatesController } from './interfaces/controllers/order.admin.booster-candidates.controller';
import { OrderHallListController } from './interfaces/controllers/order.hall.list.controller';
import { OrderHallAcceptController } from './interfaces/controllers/order.hall.accept.controller';
import { OrderBoosterListController } from './interfaces/controllers/order.booster.list.controller';
import { OrderBoosterCompleteController } from './interfaces/controllers/order.booster.complete.controller';

/**
 * 服务订单模块。
 * DDD 四层装配：用户在商品详情页下单 → 复用钱包模块的支付宝/微信收款驱动
 * 扫码支付 → 异步回调幂等落账进入「待客服处理」。
 * 客服可把已支付订单下发接单大厅，打手（booster 角色）接单 → 服务 → 完成。
 * 注意控制器注册顺序：静态路由（mine/pay）在参数路由（:id）之前。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    CommerceModule,
    WalletModule,
    BoosterModule,
    MemberModule,
    CouponModule,
    ImModule,
    TypeOrmModule.forFeature([OrderEntity]),
  ],
  controllers: [
    OrderCallbackController,
    OrderMineListController,
    OrderHallListController,
    OrderHallAcceptController,
    OrderBoosterListController,
    OrderBoosterCompleteController,
    OrderCreateController,
    OrderCancelController,
    OrderAdminListController,
    OrderAdminBoosterCandidatesController,
    OrderAdminDispatchController,
    OrderAdminAssignController,
    OrderAdminGroupJoinController,
    OrderAdminDetailController,
    OrderPayQueryController,
    OrderMineDetailController,
  ],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: TypeormOrderRepository },
    CreateOrderUseCase,
    HandleOrderCallbackUseCase,
    OrderPaymentSettleService,
    GetMyOrderUseCase,
    QueryOrderPaymentUseCase,
    ListMyOrdersUseCase,
    CancelMyOrderUseCase,
    ListAdminOrdersUseCase,
    GetAdminOrderUseCase,
    DispatchOrderUseCase,
    ListHallOrdersUseCase,
    AcceptHallOrderUseCase,
    ListBoosterOrdersUseCase,
    CompleteBoosterOrderUseCase,
    AssignOrderBoosterUseCase,
    ListBoosterCandidatesUseCase,
    JoinOrderGroupUseCase,
    BoosterAccess,
    OrderGroupService,
    ServiceAgentScope,
  ],
  exports: [ORDER_REPOSITORY],
})
export class OrderModule {}
