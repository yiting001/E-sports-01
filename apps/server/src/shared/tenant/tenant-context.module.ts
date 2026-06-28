import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantSubscriber } from './tenant.subscriber';

/**
 * 租户上下文基础设施模块（全局）。
 * 提供贯穿全应用的 TenantContextService、写入回填订阅器与上下文中间件，
 * 使各业务模块的仓储可注入同一上下文做行级隔离。
 */
@Global()
@Module({
  providers: [TenantContextService, TenantSubscriber],
  exports: [TenantContextService],
})
export class TenantContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
