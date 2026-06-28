import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';

import { UploadedFileEntity } from './domain/uploaded-file.entity';
import { FILE_REPOSITORY } from './domain/file-repository.interface';
import { STORAGE_PORTS } from './domain/storage-driver.interface';

import { TypeormFileRepository } from './infrastructure/file.repository';
import { LocalStorageDriver } from './infrastructure/drivers/local-storage.driver';
import { OssStorageDriver } from './infrastructure/drivers/oss-storage.driver';

import { StorageResolver } from './application/storage.resolver';
import { UploadFileUseCase } from './application/use-cases/upload-file.usecase';
import { ListFilesUseCase } from './application/use-cases/list-files.usecase';
import { RemoveFileUseCase } from './application/use-cases/remove-file.usecase';

import { UploadController } from './interfaces/controllers/upload.controller';
import { UploadSelfController } from './interfaces/controllers/upload.self.controller';
import { FileListController } from './interfaces/controllers/file.list.controller';
import { FileRemoveController } from './interfaces/controllers/file.remove.controller';

/**
 * 文件上传模块。
 * 策略模式 + 配置驱动：local（默认）/ oss 两套存储驱动统一接口，
 * 运行时由配置中心 upload.driver 选择，新增驱动只需实现 StoragePort 并注册。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    TypeOrmModule.forFeature([UploadedFileEntity]),
  ],
  controllers: [
    UploadController,
    UploadSelfController,
    FileListController,
    FileRemoveController,
  ],
  providers: [
    { provide: FILE_REPOSITORY, useClass: TypeormFileRepository },
    LocalStorageDriver,
    OssStorageDriver,
    {
      provide: STORAGE_PORTS,
      useFactory: (local: LocalStorageDriver, oss: OssStorageDriver) => [
        local,
        oss,
      ],
      inject: [LocalStorageDriver, OssStorageDriver],
    },
    StorageResolver,
    UploadFileUseCase,
    ListFilesUseCase,
    RemoveFileUseCase,
  ],
})
export class UploadModule {}
