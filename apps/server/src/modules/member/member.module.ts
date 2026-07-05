import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';

import { MemberProfileEntity } from './domain/member-profile.entity';
import { MEMBER_REPOSITORY } from './domain/member-repository.interface';
import { TypeormMemberRepository } from './infrastructure/member.repository';

import { MemberLevelService } from './application/member-level.service';
import { MemberProgressService } from './application/member-progress.service';
import { GetMyMemberUseCase } from './application/use-cases/get-my-member.usecase';
import { GetMemberLevelsUseCase } from './application/use-cases/get-member-levels.usecase';
import { SetMemberLevelsUseCase } from './application/use-cases/set-member-levels.usecase';

import { MemberMineController } from './interfaces/controllers/member.mine.controller';
import { MemberLevelsGetController } from './interfaces/controllers/member.levels.get.controller';
import { MemberLevelsSetController } from './interfaces/controllers/member.levels.set.controller';

/**
 * 用户会员等级模块。
 * DDD 四层：档位（名称/消费门槛/折扣万分比）存配置中心，管理端可编辑；
 * 累计消费在订单支付成功时累加，等级读取时实时解析（档位调整立即生效）；
 * 对外导出等级/进度服务，供订单模块下单取折扣、支付成功后累计消费。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    TypeOrmModule.forFeature([MemberProfileEntity]),
  ],
  controllers: [
    MemberMineController,
    MemberLevelsGetController,
    MemberLevelsSetController,
  ],
  providers: [
    { provide: MEMBER_REPOSITORY, useClass: TypeormMemberRepository },
    MemberLevelService,
    MemberProgressService,
    GetMyMemberUseCase,
    GetMemberLevelsUseCase,
    SetMemberLevelsUseCase,
  ],
  exports: [MemberLevelService, MemberProgressService],
})
export class MemberModule {}
