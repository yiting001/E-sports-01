import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';

import { SysLog } from './domain/sys-log.entity';
import { LOG_REPOSITORY } from './domain/log-repository.interface';
import { TypeormLogRepository } from './infrastructure/typeorm-log.repository';

import { TraceContextService } from './application/trace-context.service';
import { LogWriter } from './application/log-writer.service';
import { LogSettingsService } from './application/log-settings.service';
import { AppLogger } from './application/app-logger.service';
import { ListLogsUseCase } from './application/use-cases/list-logs.usecase';
import { GetTraceDetailUseCase } from './application/use-cases/get-trace-detail.usecase';
import { PurgeLogsUseCase } from './application/use-cases/purge-logs.usecase';

import { TraceContextMiddleware } from './interfaces/trace-context.middleware';
import { LoggingInterceptor } from './interfaces/logging.interceptor';
import { LogListController } from './interfaces/controllers/log.list.controller';
import { LogTraceDetailController } from './interfaces/controllers/log.trace-detail.controller';
import { LogPurgeController } from './interfaces/controllers/log.purge.controller';

/**
 * 可观测性模块（链路追踪 + 日志管理）。
 * 装配链路上下文、缓冲日志写入、访问/错误日志拦截器与日志查询/清理接口；
 * 全局应用 TraceContextMiddleware 与 LoggingInterceptor，对外导出链路与日志能力。
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SysLog])],
  controllers: [LogListController, LogTraceDetailController, LogPurgeController],
  providers: [
    { provide: LOG_REPOSITORY, useClass: TypeormLogRepository },
    TraceContextService,
    LogWriter,
    LogSettingsService,
    AppLogger,
    ListLogsUseCase,
    GetTraceDetailUseCase,
    PurgeLogsUseCase,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [TraceContextService, AppLogger],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceContextMiddleware).forRoutes('*');
  }
}
