import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';

import { RealnameAuthEntity } from './domain/realname-auth.entity';
import { REALNAME_REPOSITORY } from './domain/realname-repository.interface';
import { ID_CARD_CIPHER } from './domain/id-card-cipher.interface';

import { TypeormRealnameRepository } from './infrastructure/realname.repository';
import { IdCardCipher } from './infrastructure/id-card.cipher';
import { RealnameSeeder } from './infrastructure/realname.seeder';

import { RealnamePolicyService } from './application/policy.service';
import { GetMyRealnameUseCase } from './application/use-cases/get-my-realname.usecase';
import { SubmitRealnameUseCase } from './application/use-cases/submit-realname.usecase';
import { ListRealnameUseCase } from './application/use-cases/list-realname.usecase';
import { ReviewRealnameUseCase } from './application/use-cases/review-realname.usecase';
import { GetRealnamePolicyUseCase } from './application/use-cases/get-policy.usecase';
import { SetRealnamePolicyUseCase } from './application/use-cases/set-policy.usecase';

import { RealnameMineController } from './interfaces/controllers/realname.mine.controller';
import { RealnameSubmitController } from './interfaces/controllers/realname.submit.controller';
import { RealnameListController } from './interfaces/controllers/realname.list.controller';
import { RealnameReviewController } from './interfaces/controllers/realname.review.controller';
import { RealnamePolicyGetController } from './interfaces/controllers/realname.policy.get.controller';
import { RealnamePolicySetController } from './interfaces/controllers/realname.policy.set.controller';

/**
 * 实名认证模块。
 * DDD 四层：用户提交真实姓名 + 身份证（加密入库、脱敏对外）+ 证件照，
 * 管理员审核通过/驳回；超管经配置中心设定「哪些角色需实名」。
 * 身份证号经 IdCardCipher 端口加解密，策略读写经 RealnamePolicyService 收口。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    TypeOrmModule.forFeature([RealnameAuthEntity]),
  ],
  controllers: [
    RealnameMineController,
    RealnameSubmitController,
    RealnameListController,
    RealnameReviewController,
    RealnamePolicyGetController,
    RealnamePolicySetController,
  ],
  providers: [
    { provide: REALNAME_REPOSITORY, useClass: TypeormRealnameRepository },
    { provide: ID_CARD_CIPHER, useClass: IdCardCipher },
    RealnamePolicyService,
    RealnameSeeder,
    GetMyRealnameUseCase,
    SubmitRealnameUseCase,
    ListRealnameUseCase,
    ReviewRealnameUseCase,
    GetRealnamePolicyUseCase,
    SetRealnamePolicyUseCase,
  ],
})
export class RealnameModule {}
