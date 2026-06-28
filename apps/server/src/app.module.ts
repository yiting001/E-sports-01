import { Module } from '@nestjs/common';
import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { TenantContextModule } from './shared/tenant/tenant-context.module';
import { ConfigModule } from './modules/config/config.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { SmsModule } from './modules/sms/sms.module';
import { UploadModule } from './modules/upload/upload.module';
import { ImModule } from './modules/im/im.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { WalletModule } from './modules/wallet/wallet.module';

/**
 * 应用根模块。
 * 仅负责装配基础设施模块与各业务模块，不承载业务逻辑。
 */
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    TenantContextModule,
    ConfigModule,
    SmsModule,
    RbacModule,
    UploadModule,
    ImModule,
    ObservabilityModule,
    WalletModule,
  ],
})
export class AppModule {}
