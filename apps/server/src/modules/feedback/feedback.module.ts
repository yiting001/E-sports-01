import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';

import { FeedbackEntity } from './domain/feedback.entity';
import { FEEDBACK_REPOSITORY } from './domain/feedback-repository.interface';

import { TypeormFeedbackRepository } from './infrastructure/feedback.repository';

import { SubmitFeedbackUseCase } from './application/use-cases/submit-feedback.usecase';
import { ListMyFeedbackUseCase } from './application/use-cases/list-my-feedback.usecase';
import { ListFeedbackUseCase } from './application/use-cases/list-feedback.usecase';
import { HandleFeedbackUseCase } from './application/use-cases/handle-feedback.usecase';

import { FeedbackSubmitController } from './interfaces/controllers/feedback.submit.controller';
import { FeedbackMineController } from './interfaces/controllers/feedback.mine.controller';
import { FeedbackListController } from './interfaces/controllers/feedback.list.controller';
import { FeedbackHandleController } from './interfaces/controllers/feedback.handle.controller';

/**
 * 反馈/投诉模块。
 * DDD 四层：C 端用户提交对客服/打手的投诉反馈并查看处理进度；
 * 管理端按状态/类型检索反馈列表、填写处理回复完成闭环。
 */
@Module({
  imports: [RbacModule, TypeOrmModule.forFeature([FeedbackEntity])],
  controllers: [
    FeedbackSubmitController,
    FeedbackMineController,
    FeedbackListController,
    FeedbackHandleController,
  ],
  providers: [
    { provide: FEEDBACK_REPOSITORY, useClass: TypeormFeedbackRepository },
    SubmitFeedbackUseCase,
    ListMyFeedbackUseCase,
    ListFeedbackUseCase,
    HandleFeedbackUseCase,
  ],
})
export class FeedbackModule {}
