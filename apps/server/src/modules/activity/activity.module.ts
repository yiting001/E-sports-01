import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';

import { ActivityEntity } from './domain/activity.entity';
import { ACTIVITY_REPOSITORY } from './domain/activity-repository.interface';

import { TypeormActivityRepository } from './infrastructure/activity.repository';

import { ListActivitiesUseCase } from './application/use-cases/list-activities.usecase';
import { SaveActivityUseCase } from './application/use-cases/save-activity.usecase';
import { RemoveActivityUseCase } from './application/use-cases/remove-activity.usecase';
import { ListPublicActivitiesUseCase } from './application/use-cases/list-public-activities.usecase';
import { GetPublicActivityUseCase } from './application/use-cases/get-public-activity.usecase';

import { ActivityAdminListController } from './interfaces/controllers/activity.admin.list.controller';
import { ActivityAdminCreateController } from './interfaces/controllers/activity.admin.create.controller';
import { ActivityAdminUpdateController } from './interfaces/controllers/activity.admin.update.controller';
import { ActivityAdminRemoveController } from './interfaces/controllers/activity.admin.remove.controller';
import { ActivityPublicListController } from './interfaces/controllers/activity.public-list.controller';
import { ActivityPublicDetailController } from './interfaces/controllers/activity.public-detail.controller';

/**
 * 福利活动模块。
 * DDD 四层：管理端发布运营活动（封面/富文本/起止时间，RBAC 门控）；
 * C 端「福利活动」入口浏览进行中的活动列表与详情（仅登录态）。
 */
@Module({
  imports: [RbacModule, TypeOrmModule.forFeature([ActivityEntity])],
  controllers: [
    ActivityAdminListController,
    ActivityAdminCreateController,
    ActivityAdminUpdateController,
    ActivityAdminRemoveController,
    ActivityPublicListController,
    ActivityPublicDetailController,
  ],
  providers: [
    { provide: ACTIVITY_REPOSITORY, useClass: TypeormActivityRepository },
    ListActivitiesUseCase,
    SaveActivityUseCase,
    RemoveActivityUseCase,
    ListPublicActivitiesUseCase,
    GetPublicActivityUseCase,
  ],
})
export class ActivityModule {}
