import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';
import { BoosterModule } from '../booster/booster.module';
import { MemberModule } from '../member/member.module';
import { OrderEntity } from '../order/domain/order.entity';
import { WalletTransactionEntity } from '../wallet/domain/wallet-transaction.entity';
import { User } from '../rbac/domain/user.entity';
import { BoosterApplicationEntity } from '../booster/domain/booster-application.entity';
import { MemberProfileEntity } from '../member/domain/member-profile.entity';

import { STATS_REPOSITORY } from './domain/stats-repository.interface';
import { TypeormStatsRepository } from './infrastructure/stats.repository';
import { GetOrderStatsUseCase } from './application/use-cases/get-order-stats.usecase';
import { GetFinanceStatsUseCase } from './application/use-cases/get-finance-stats.usecase';
import { GetUserStatsUseCase } from './application/use-cases/get-user-stats.usecase';
import { GetBoosterStatsUseCase } from './application/use-cases/get-booster-stats.usecase';

import { OrderStatsController } from './interfaces/controllers/order-stats.controller';
import { FinanceStatsController } from './interfaces/controllers/finance-stats.controller';
import { UserStatsController } from './interfaces/controllers/user-stats.controller';
import { BoosterStatsController } from './interfaces/controllers/booster-stats.controller';

/**
 * 数据统计仪表盘模块。
 * DDD 四层：对既有业务表（订单/钱包流水/用户/打手/会员）做只读聚合，不落任何新表；
 * 统计按业务域分块（订单/财务/用户/打手），一块一接口一权限码，
 * 时间范围支持日/月/年三档；等级分布复用打手/会员档位配置实时解析。
 */
@Module({
  imports: [
    RbacModule,
    BoosterModule,
    MemberModule,
    TypeOrmModule.forFeature([
      OrderEntity,
      WalletTransactionEntity,
      User,
      BoosterApplicationEntity,
      MemberProfileEntity,
    ]),
  ],
  controllers: [
    OrderStatsController,
    FinanceStatsController,
    UserStatsController,
    BoosterStatsController,
  ],
  providers: [
    { provide: STATS_REPOSITORY, useClass: TypeormStatsRepository },
    GetOrderStatsUseCase,
    GetFinanceStatsUseCase,
    GetUserStatsUseCase,
    GetBoosterStatsUseCase,
  ],
})
export class DashboardModule {}
