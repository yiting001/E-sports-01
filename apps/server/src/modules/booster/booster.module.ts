import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';

import { BoosterApplicationEntity } from './domain/booster-application.entity';
import { BOOSTER_REPOSITORY } from './domain/booster-repository.interface';

import { TypeormBoosterRepository } from './infrastructure/booster.repository';

import { GetMyBoosterUseCase } from './application/use-cases/get-my-booster.usecase';
import { SubmitBoosterUseCase } from './application/use-cases/submit-booster.usecase';
import { ListBoosterUseCase } from './application/use-cases/list-booster.usecase';
import { ReviewBoosterUseCase } from './application/use-cases/review-booster.usecase';
import { UpdateBoosterUseCase } from './application/use-cases/update-booster.usecase';

import { BoosterMineController } from './interfaces/controllers/booster.mine.controller';
import { BoosterSubmitController } from './interfaces/controllers/booster.submit.controller';
import { BoosterListController } from './interfaces/controllers/booster.list.controller';
import { BoosterReviewController } from './interfaces/controllers/booster.review.controller';
import { BoosterUpdateController } from './interfaces/controllers/booster.update.controller';

/**
 * 打手入驻模块。
 * DDD 四层：用户在个人中心提交入驻申请（游戏昵称/擅长游戏/段位/自我介绍），
 * 管理员审核通过后经 RBAC 的 RoleGranter 自动授予 booster 角色，驳回可重提；
 * 管理端可对打手资料进行编辑维护。
 */
@Module({
  imports: [RbacModule, TypeOrmModule.forFeature([BoosterApplicationEntity])],
  controllers: [
    BoosterMineController,
    BoosterSubmitController,
    BoosterListController,
    BoosterReviewController,
    BoosterUpdateController,
  ],
  providers: [
    { provide: BOOSTER_REPOSITORY, useClass: TypeormBoosterRepository },
    GetMyBoosterUseCase,
    SubmitBoosterUseCase,
    ListBoosterUseCase,
    ReviewBoosterUseCase,
    UpdateBoosterUseCase,
  ],
})
export class BoosterModule {}
