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
import { ListConfigsController } from './interfaces/list-configs.controller';
import { GetBrandingController } from './interfaces/get-branding.controller';
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
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
