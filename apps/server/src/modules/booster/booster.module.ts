import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';
import { RealnameModule } from '../realname/realname.module';
import { WalletModule } from '../wallet/wallet.module';
import { UploadModule } from '../upload/upload.module';

import { BoosterApplicationEntity } from './domain/booster-application.entity';
import { BoosterPenaltyEntity } from './domain/booster-penalty.entity';
import { BOOSTER_REPOSITORY } from './domain/booster-repository.interface';
import { BOOSTER_DIRECTORY_QUERY } from './domain/booster-directory.query';
import { BOOSTER_PENALTY_REPOSITORY } from './domain/penalty-repository.interface';
import { BOOSTER_FINANCE_SETTLEMENT } from './domain/booster-finance-settlement.interface';

import { TypeormBoosterRepository } from './infrastructure/booster.repository';
import { TypeormBoosterDirectoryQuery } from './infrastructure/booster-directory.query';
import { TypeormBoosterPenaltyRepository } from './infrastructure/penalty.repository';
import {
  BOOSTER_FEEDBACK_PENALTY_TRANSACTION,
  TypeormBoosterFeedbackPenaltyTransaction,
} from './infrastructure/booster-feedback-penalty.transaction';
import { TypeormBoosterFinanceSettlement } from './infrastructure/booster-finance.settlement';

import { BoosterPolicyService } from './application/booster-policy.service';
import { BoosterProgressService } from './application/booster-progress.service';
import { BoosterDepositGuard } from './application/booster-deposit.service';
import { BoosterRealnameGuard } from './application/booster-realname.service';
import { BoosterSelectionService } from './application/booster-selection.service';
import { BoosterCandidateService } from './application/booster-candidate.service';
import { GetMyBoosterUseCase } from './application/use-cases/get-my-booster.usecase';
import { SubmitBoosterUseCase } from './application/use-cases/submit-booster.usecase';
import { ListBoosterUseCase } from './application/use-cases/list-booster.usecase';
import { ReviewBoosterUseCase } from './application/use-cases/review-booster.usecase';
import { UpdateBoosterUseCase } from './application/use-cases/update-booster.usecase';
import { GetBoosterLevelsUseCase } from './application/use-cases/get-booster-levels.usecase';
import { SetBoosterLevelsUseCase } from './application/use-cases/set-booster-levels.usecase';
import { PayDepositUseCase } from './application/use-cases/pay-deposit.usecase';
import { GetDepositPolicyUseCase } from './application/use-cases/get-deposit-policy.usecase';
import { SetDepositPolicyUseCase } from './application/use-cases/set-deposit-policy.usecase';
import { RefundDepositUseCase } from './application/use-cases/refund-deposit.usecase';
import { CreatePenaltyUseCase } from './application/use-cases/create-penalty.usecase';
import { ListPenaltiesUseCase } from './application/use-cases/list-penalties.usecase';
import { ListBoosterDirectoryUseCase } from './application/use-cases/list-booster-directory.usecase';
import { GetBoosterPublicProfileUseCase } from './application/use-cases/get-booster-public-profile.usecase';
import { UpdateMyBoosterVoiceUseCase } from './application/use-cases/update-my-booster-voice.usecase';
import { UpdateMyBoosterAvailabilityUseCase } from './application/use-cases/update-my-booster-availability.usecase';

import { BoosterMineController } from './interfaces/controllers/booster.mine.controller';
import { BoosterSubmitController } from './interfaces/controllers/booster.submit.controller';
import { BoosterListController } from './interfaces/controllers/booster.list.controller';
import { BoosterReviewController } from './interfaces/controllers/booster.review.controller';
import { BoosterUpdateController } from './interfaces/controllers/booster.update.controller';
import { BoosterLevelsGetController } from './interfaces/controllers/booster.levels.get.controller';
import { BoosterLevelsSetController } from './interfaces/controllers/booster.levels.set.controller';
import { BoosterDepositPayController } from './interfaces/controllers/booster.deposit.pay.controller';
import { BoosterDepositPolicyGetController } from './interfaces/controllers/booster.deposit.policy.get.controller';
import { BoosterDepositPolicySetController } from './interfaces/controllers/booster.deposit.policy.set.controller';
import { BoosterDepositRefundController } from './interfaces/controllers/booster.deposit.refund.controller';
import { PenaltyCreateController } from './interfaces/controllers/penalty.create.controller';
import { PenaltyListController } from './interfaces/controllers/penalty.list.controller';
import { BoosterDirectoryListController } from './interfaces/controllers/booster.directory.list.controller';
import { BoosterDirectoryDetailController } from './interfaces/controllers/booster.directory.detail.controller';
import { BoosterMineVoiceUpdateController } from './interfaces/controllers/booster.mine.voice.update.controller';
import { BoosterMineVoiceRemoveController } from './interfaces/controllers/booster.mine.voice.remove.controller';
import { BoosterVoiceUpdateController } from './interfaces/controllers/booster.voice.update.controller';
import { BoosterVoiceRemoveController } from './interfaces/controllers/booster.voice.remove.controller';
import { BoosterMineAvailabilityController } from './interfaces/controllers/booster.mine.availability.controller';

/**
 * 打手模块。
 * DDD 四层：入驻申请与审核（实名前置校验，通过授予 booster 角色）、
 * 等级体系（档位存配置中心，按累计完成单数自动定级，等级越高提成越高）、
 * 押金（管理端配最低/最高交付额，区间内自选金额从钱包余额缴纳、管理端退还，经 WalletLedger 记流水）、
 * 财务罚款（从余额或押金扣除，记录留档）。
 * 对外导出进度/押金门禁服务，供订单模块在完成结算与接单时调用。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    RealnameModule,
    WalletModule,
    UploadModule,
    TypeOrmModule.forFeature([BoosterApplicationEntity, BoosterPenaltyEntity]),
  ],
  controllers: [
    BoosterMineController,
    BoosterMineAvailabilityController,
    BoosterDirectoryListController,
    BoosterDirectoryDetailController,
    BoosterMineVoiceUpdateController,
    BoosterMineVoiceRemoveController,
    BoosterVoiceUpdateController,
    BoosterVoiceRemoveController,
    BoosterLevelsGetController,
    BoosterLevelsSetController,
    BoosterDepositPayController,
    BoosterDepositPolicyGetController,
    BoosterDepositPolicySetController,
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
      provide: BOOSTER_DIRECTORY_QUERY,
      useClass: TypeormBoosterDirectoryQuery,
    },
    {
      provide: BOOSTER_PENALTY_REPOSITORY,
      useClass: TypeormBoosterPenaltyRepository,
    },
    {
      provide: BOOSTER_FEEDBACK_PENALTY_TRANSACTION,
      useClass: TypeormBoosterFeedbackPenaltyTransaction,
    },
    {
      provide: BOOSTER_FINANCE_SETTLEMENT,
      useClass: TypeormBoosterFinanceSettlement,
    },
    BoosterPolicyService,
    BoosterProgressService,
    BoosterDepositGuard,
    BoosterRealnameGuard,
    BoosterSelectionService,
    BoosterCandidateService,
    GetMyBoosterUseCase,
    SubmitBoosterUseCase,
    ListBoosterUseCase,
    ReviewBoosterUseCase,
    UpdateBoosterUseCase,
    GetBoosterLevelsUseCase,
    SetBoosterLevelsUseCase,
    PayDepositUseCase,
    GetDepositPolicyUseCase,
    SetDepositPolicyUseCase,
    RefundDepositUseCase,
    CreatePenaltyUseCase,
    ListPenaltiesUseCase,
    ListBoosterDirectoryUseCase,
    GetBoosterPublicProfileUseCase,
    UpdateMyBoosterVoiceUseCase,
    UpdateMyBoosterAvailabilityUseCase,
  ],
  // 供订单模块：完成结算时定级取费率、接单时校验押金与实名
  exports: [
    BoosterProgressService,
    BoosterDepositGuard,
    BoosterRealnameGuard,
    BoosterPolicyService,
    BoosterSelectionService,
    BoosterCandidateService,
    BOOSTER_FEEDBACK_PENALTY_TRANSACTION,
  ],
})
export class BoosterModule {}
