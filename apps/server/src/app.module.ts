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
import { RealnameModule } from './modules/realname/realname.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { BoosterModule } from './modules/booster/booster.module';
import { MemberModule } from './modules/member/member.module';
import { NoticeModule } from './modules/notice/notice.module';
import { ThemeModule } from './modules/theme/theme.module';
import { OrderModule } from './modules/order/order.module';
import { ReviewModule } from './modules/review/review.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { ActivityModule } from './modules/activity/activity.module';
import { RankModule } from './modules/rank/rank.module';
import { InviteModule } from './modules/invite/invite.module';

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
    RealnameModule,
    CommerceModule,
    FeedbackModule,
    BoosterModule,
    MemberModule,
    NoticeModule,
    ThemeModule,
    OrderModule,
    ReviewModule,
    DashboardModule,
    CouponModule,
    ActivityModule,
    RankModule,
    InviteModule,
  ],
})
export class AppModule {}
