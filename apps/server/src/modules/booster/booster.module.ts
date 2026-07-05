import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';
import { RealnameModule } from '../realname/realname.module';
import { WalletModule } from '../wallet/wallet.module';

import { BoosterApplicationEntity } from './domain/booster-application.entity';
import { BoosterPenaltyEntity } from './domain/booster-penalty.entity';
import { BOOSTER_REPOSITORY } from './domain/booster-repository.interface';
import { BOOSTER_PENALTY_REPOSITORY } from './domain/penalty-repository.interface';

import { TypeormBoosterRepository } from './infrastructure/booster.repository';
import { TypeormBoosterPenaltyRepository } from './infrastructure/penalty.repository';

import { BoosterPolicyService } from './application/booster-policy.service';
import { BoosterProgressService } from './application/booster-progress.service';
import { BoosterDepositGuard } from './application/booster-deposit.service';
import { GetMyBoosterUseCase } from './application/use-cases/get-my-booster.usecase';
import { SubmitBoosterUseCase } from './application/use-cases/submit-booster.usecase';
import { ListBoosterUseCase } from './application/use-cases/list-booster.usecase';
import { ReviewBoosterUseCase } from './application/use-cases/review-booster.usecase';
import { UpdateBoosterUseCase } from './application/use-cases/update-booster.usecase';
import { GetBoosterLevelsUseCase } from './application/use-cases/get-booster-levels.usecase';
import { SetBoosterLevelsUseCase } from './application/use-cases/set-booster-levels.usecase';
import { PayDepositUseCase } from './application/use-cases/pay-deposit.usecase';
import { RefundDepositUseCase } from './application/use-cases/refund-deposit.usecase';
import { CreatePenaltyUseCase } from './application/use-cases/create-penalty.usecase';
import { ListPenaltiesUseCase } from './application/use-cases/list-penalties.usecase';

import { BoosterMineController } from './interfaces/controllers/booster.mine.controller';
import { BoosterSubmitController } from './interfaces/controllers/booster.submit.controller';
import { BoosterListController } from './interfaces/controllers/booster.list.controller';
import { BoosterReviewController } from './interfaces/controllers/booster.review.controller';
import { BoosterUpdateController } from './interfaces/controllers/booster.update.controller';
import { BoosterLevelsGetController } from './interfaces/controllers/booster.levels.get.controller';
import { BoosterLevelsSetController } from './interfaces/controllers/booster.levels.set.controller';
import { BoosterDepositPayController } from './interfaces/controllers/booster.deposit.pay.controller';
import { BoosterDepositRefundController } from './interfaces/controllers/booster.deposit.refund.controller';
import { PenaltyCreateController } from './interfaces/controllers/penalty.create.controller';
import { PenaltyListController } from './interfaces/controllers/penalty.list.controller';

/**
 * 打手模块。
 * DDD 四层：入驻申请与审核（实名前置校验，通过授予 booster 角色）、
 * 等级体系（档位存配置中心，按累计完成单数自动定级，等级越高提成越高）、
 * 押金（从钱包余额缴纳、管理端退还，经 WalletLedger 记流水）、
 * 财务罚款（从余额或押金扣除，记录留档）。
 * 对外导出进度/押金门禁服务，供订单模块在完成结算与接单时调用。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    RealnameModule,
    WalletModule,
    TypeOrmModule.forFeature([BoosterApplicationEntity, BoosterPenaltyEntity]),
  ],
  controllers: [
    BoosterMineController,
    BoosterLevelsGetController,
    BoosterLevelsSetController,
    BoosterDepositPayController,
    BoosterDepositRefundController,
    BoosterSubmitController,
    BoosterListController,
    BoosterReviewController,
    BoosterUpdateController,
    PenaltyCreateController,
    PenaltyListController,
  ],
  providers: [
    { provide: BOOSTER_REPOSITORY, useClass: TypeormBoosterRepository },
    {
      provide: BOOSTER_PENALTY_REPOSITORY,
      useClass: TypeormBoosterPenaltyRepository,
    },
    BoosterPolicyService,
    BoosterProgressService,
    BoosterDepositGuard,
    GetMyBoosterUseCase,
    SubmitBoosterUseCase,
    ListBoosterUseCase,
    ReviewBoosterUseCase,
    UpdateBoosterUseCase,
    GetBoosterLevelsUseCase,
    SetBoosterLevelsUseCase,
    PayDepositUseCase,
    RefundDepositUseCase,
    CreatePenaltyUseCase,
    ListPenaltiesUseCase,
  ],
  // 供订单模块：完成结算时定级取费率、接单时校验押金
  exports: [BoosterProgressService, BoosterDepositGuard],
})
export class BoosterModule {}
