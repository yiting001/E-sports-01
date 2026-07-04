import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';
import { ConfigModule } from '../config/config.module';

import { NoticeEntity } from './domain/notice.entity';
import { NOTICE_REPOSITORY } from './domain/notice-repository.interface';

import { TypeormNoticeRepository } from './infrastructure/notice.repository';

import { ListNoticesUseCase } from './application/use-cases/list-notices.usecase';
import { SaveNoticeUseCase } from './application/use-cases/save-notice.usecase';
import { RemoveNoticeUseCase } from './application/use-cases/remove-notice.usecase';
import { ListPublicNoticesUseCase } from './application/use-cases/list-public-notices.usecase';
import { GetPublicNoticeUseCase } from './application/use-cases/get-public-notice.usecase';
import { GetPortalBannerUseCase } from './application/use-cases/get-portal-banner.usecase';
import { UpdatePortalBannerUseCase } from './application/use-cases/update-portal-banner.usecase';

import { BannerGetController } from './interfaces/controllers/banner.get.controller';
import { BannerUpdateController } from './interfaces/controllers/banner.update.controller';
import { NoticePublicListController } from './interfaces/controllers/notice.public-list.controller';
import { NoticePublicDetailController } from './interfaces/controllers/notice.public-detail.controller';
import { NoticeListController } from './interfaces/controllers/notice.list.controller';
import { NoticeCreateController } from './interfaces/controllers/notice.create.controller';
import { NoticeUpdateController } from './interfaces/controllers/notice.update.controller';
import { NoticeRemoveController } from './interfaces/controllers/notice.remove.controller';

/**
 * 运营通知模块。
 * DDD 四层：管理端维护通知公告（富文本详情、启停、排序）与首页横幅图片（存配置中心）；
 * C 端首页公告条/横幅经公开接口读取，通知点击查看详情。
 * 注意：banner 与 public 等静态路由控制器需注册在带 :id 参数的控制器之前。
 */
@Module({
  imports: [RbacModule, ConfigModule, TypeOrmModule.forFeature([NoticeEntity])],
  controllers: [
    BannerGetController,
    BannerUpdateController,
    NoticePublicListController,
    NoticePublicDetailController,
    NoticeListController,
    NoticeCreateController,
    NoticeUpdateController,
    NoticeRemoveController,
  ],
  providers: [
    { provide: NOTICE_REPOSITORY, useClass: TypeormNoticeRepository },
    ListNoticesUseCase,
    SaveNoticeUseCase,
    RemoveNoticeUseCase,
    ListPublicNoticesUseCase,
    GetPublicNoticeUseCase,
    GetPortalBannerUseCase,
    UpdatePortalBannerUseCase,
  ],
})
export class NoticeModule {}
