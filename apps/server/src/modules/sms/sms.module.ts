import { Module } from '@nestjs/common';

import { ConfigModule } from '../config/config.module';

import { SMS_PORTS } from './domain/sms-port.interface';
import { LogSmsDriver } from './infrastructure/drivers/log-sms.driver';
import { AliyunSmsDriver } from './infrastructure/drivers/aliyun-sms.driver';
import { TencentSmsDriver } from './infrastructure/drivers/tencent-sms.driver';
import { VolcanoSmsDriver } from './infrastructure/drivers/volcano-sms.driver';
import { SmsResolver } from './application/sms.resolver';
import { SmsCodeService } from './application/sms-code.service';

/**
 * 短信模块。
 * 策略模式 + 配置驱动：aliyun / tencent / volcano / log（模拟）四套驱动统一接口，
 * 运行时由配置中心 sms.provider 选择，新增服务商只需实现 SmsPort 并注册。
 * 对外仅暴露通用的验证码能力 SmsCodeService（生成/存储/限流/校验），与业务解耦。
 */
@Module({
  imports: [ConfigModule],
  providers: [
    LogSmsDriver,
    AliyunSmsDriver,
    TencentSmsDriver,
    VolcanoSmsDriver,
    {
      provide: SMS_PORTS,
      useFactory: (
        log: LogSmsDriver,
        aliyun: AliyunSmsDriver,
        tencent: TencentSmsDriver,
        volcano: VolcanoSmsDriver,
      ) => [log, aliyun, tencent, volcano],
      inject: [LogSmsDriver, AliyunSmsDriver, TencentSmsDriver, VolcanoSmsDriver],
    },
    SmsResolver,
    SmsCodeService,
  ],
  exports: [SmsCodeService],
})
export class SmsModule {}
