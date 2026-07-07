import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';
import { ConfigModule } from '../config/config.module';
import { CouponModule } from '../coupon/coupon.module';
import { WalletModule } from '../wallet/wallet.module';

import { InviteCodeEntity } from './domain/invite-code.entity';
import { InviteRecordEntity } from './domain/invite-record.entity';
import { INVITE_REPOSITORY } from './domain/invite-repository.interface';

import { TypeormInviteRepository } from './infrastructure/invite.repository';

import { InviteCodeService } from './application/invite-code.service';
import { InviteConfigService } from './application/invite-config.service';
import { InviteRewardService } from './application/invite-reward.service';
import { GetMyInviteUseCase } from './application/use-cases/get-my-invite.usecase';
import { BindInviteUseCase } from './application/use-cases/bind-invite.usecase';
import { ListInviteRecordsUseCase } from './application/use-cases/list-invite-records.usecase';

import { InviteMineController } from './interfaces/controllers/invite.mine.controller';
import { InviteBindController } from './interfaces/controllers/invite.bind.controller';
import { InviteAdminConfigGetController } from './interfaces/controllers/invite.admin.config-get.controller';
import { InviteAdminConfigSaveController } from './interfaces/controllers/invite.admin.config-save.controller';
import { InviteAdminRecordsController } from './interfaces/controllers/invite.admin.records.controller';

/**
 * 邀请模块。
 * DDD 四层：C 端一人一码（惰性生成）、好友填码绑定邀请关系（一人只能被邀请一次）；
 * 绑定成功按后台配置向邀请人/被邀请人发放奖励（优惠券走系统发券，钱包金额经账务单元入账）；
 * 奖励配置落配置中心（管理端「邀请管理」读写），发放结果文案快照落邀请记录供追溯。
 */
@Module({
  imports: [
    RbacModule,
    ConfigModule,
    CouponModule,
    WalletModule,
    TypeOrmModule.forFeature([InviteCodeEntity, InviteRecordEntity]),
  ],
  controllers: [
    InviteMineController,
    InviteBindController,
    InviteAdminConfigGetController,
    InviteAdminConfigSaveController,
    InviteAdminRecordsController,
  ],
  providers: [
    { provide: INVITE_REPOSITORY, useClass: TypeormInviteRepository },
    InviteCodeService,
    InviteConfigService,
    InviteRewardService,
    GetMyInviteUseCase,
    BindInviteUseCase,
    ListInviteRecordsUseCase,
  ],
})
export class InviteModule {}
