import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';
import { CommerceModule } from '../commerce/commerce.module';
import { WalletModule } from '../wallet/wallet.module';

import { OrderEntity } from './domain/order.entity';
import { ORDER_REPOSITORY } from './domain/order-repository.interface';
import { TypeormOrderRepository } from './infrastructure/order.repository';

import { CreateOrderUseCase } from './application/use-cases/create-order.usecase';
import { HandleOrderCallbackUseCase } from './application/use-cases/handle-order-callback.usecase';
import { GetMyOrderUseCase } from './application/use-cases/get-my-order.usecase';
import { ListMyOrdersUseCase } from './application/use-cases/list-my-orders.usecase';
import { CancelMyOrderUseCase } from './application/use-cases/cancel-my-order.usecase';

import { OrderCreateController } from './interfaces/controllers/order.create.controller';
import { OrderCallbackController } from './interfaces/controllers/order.callback.controller';
import { OrderMineListController } from './interfaces/controllers/order.mine.list.controller';
import { OrderMineDetailController } from './interfaces/controllers/order.mine.detail.controller';
import { OrderCancelController } from './interfaces/controllers/order.cancel.controller';

/**
 * 服务订单模块。
 * DDD 四层装配：用户在商品详情页下单 → 复用钱包模块的支付宝/微信收款驱动
 * 扫码支付 → 异步回调幂等落账进入「待客服处理」。
 * 后续迭代在此扩展：客服指派打手/下发接单大厅/服务流转。
 * 注意控制器注册顺序：静态路由（mine/pay）在参数路由（:id）之前。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    CommerceModule,
    WalletModule,
    TypeOrmModule.forFeature([OrderEntity]),
  ],
  controllers: [
    OrderCallbackController,
    OrderMineListController,
    OrderCreateController,
    OrderCancelController,
    OrderMineDetailController,
  ],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: TypeormOrderRepository },
    CreateOrderUseCase,
    HandleOrderCallbackUseCase,
    GetMyOrderUseCase,
    ListMyOrdersUseCase,
    CancelMyOrderUseCase,
  ],
})
export class OrderModule {}
