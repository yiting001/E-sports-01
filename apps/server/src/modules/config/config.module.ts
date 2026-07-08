import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigItem } from './domain/config-item.entity';
import { CONFIG_REPOSITORY } from './domain/config-repository.interface';
import { TypeormConfigRepository } from './infrastructure/config.repository';
import { ConfigSeeder } from './infrastructure/config.seeder';
import { ConfigService } from './application/config.service';
import { ListConfigsUseCase } from './application/use-cases/list-configs.usecase';
import { UpsertConfigUseCase } from './application/use-cases/upsert-config.usecase';
import { RemoveConfigUseCase } from './application/use-cases/remove-config.usecase';
import { GetBrandingUseCase } from './application/use-cases/get-branding.usecase';
import { GetAgreementUseCase } from './application/use-cases/get-agreement.usecase';
import { GetPortalConfigUseCase } from './application/use-cases/get-portal-config.usecase';
import { ListConfigsController } from './interfaces/list-configs.controller';
import { GetBrandingController } from './interfaces/get-branding.controller';
import { GetAgreementController } from './interfaces/get-agreement.controller';
import { GetPortalConfigController } from './interfaces/get-portal-config.controller';
import { UpsertConfigController } from './interfaces/upsert-config.controller';
import { RemoveConfigController } from './interfaces/remove-config.controller';

/**
 * 配置中心模块。
 * 对外导出 ConfigService，作为“除数据库连接外所有配置的唯一来源”，
 * 其它模块通过它读取可调参数，杜绝硬编码。
 */
@Module({
  imports: [TypeOrmModule.forFeature([ConfigItem])],
  controllers: [
    GetBrandingController,
    GetAgreementController,
    GetPortalConfigController,
    ListConfigsController,
    UpsertConfigController,
    RemoveConfigController,
  ],
  providers: [
    { provide: CONFIG_REPOSITORY, useClass: TypeormConfigRepository },
    ConfigService,
    ConfigSeeder,
    ListConfigsUseCase,
    UpsertConfigUseCase,
    RemoveConfigUseCase,
    GetBrandingUseCase,
    GetAgreementUseCase,
    GetPortalConfigUseCase,
  ],
  // 额外导出 UpsertConfigUseCase：供业务模块（如邀请奖励配置）写入配置中心
  exports: [ConfigService, UpsertConfigUseCase],
})
export class ConfigModule {}
