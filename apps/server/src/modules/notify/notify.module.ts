import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';

import { WechatBindingEntity } from './domain/wechat-binding.entity';
import { WECHAT_BINDING_REPOSITORY } from './domain/wechat-binding-repository.interface';
import {
  WECHAT_NOTIFY_PORT,
  WECHAT_OFFICIAL_AUTH_PORT,
} from './domain/wechat-notify-port.interface';

import { TypeormWechatBindingRepository } from './infrastructure/wechat-binding.repository';
import { WechatAccessTokenService } from './infrastructure/wechat-access-token.service';
import { WechatMiniNotifyDriver } from './infrastructure/drivers/wechat-mini-notify.driver';
import { WechatOfficialNotifyDriver } from './infrastructure/drivers/wechat-official-notify.driver';

import { OrderWechatNotifyService } from './application/order-wechat-notify.service';
import { GetMyWechatBindingsUseCase } from './application/use-cases/get-my-wechat-bindings.usecase';
import { BindWechatUseCase } from './application/use-cases/bind-wechat.usecase';
import { UnbindWechatUseCase } from './application/use-cases/unbind-wechat.usecase';
import { GetWechatAuthorizeUrlUseCase } from './application/use-cases/get-wechat-authorize-url.usecase';

import { WechatBindingMineController } from './interfaces/controllers/wechat-binding.mine.controller';
import { WechatBindController } from './interfaces/controllers/wechat-bind.controller';
import { WechatUnbindController } from './interfaces/controllers/wechat-unbind.controller';
import { WechatAuthorizeUrlController } from './interfaces/controllers/wechat-authorize-url.controller';

/**
 * 通知模块。
 * 承载微信小程序订阅消息与公众号模板消息两条推送渠道（策略模式，配置中心驱动），
 * 以及用户微信绑定管理；对业务模块只导出 OrderWechatNotifyService 编排口，
 * 发送失败只记日志，不阻断订单等业务主流程。
 */
@Module({
  imports: [ConfigModule, RbacModule, TypeOrmModule.forFeature([WechatBindingEntity])],
  controllers: [
    WechatBindingMineController,
    WechatBindController,
    WechatUnbindController,
    WechatAuthorizeUrlController,
  ],
  providers: [
    { provide: WECHAT_BINDING_REPOSITORY, useClass: TypeormWechatBindingRepository },
    WechatAccessTokenService,
    WechatMiniNotifyDriver,
    WechatOfficialNotifyDriver,
    {
      provide: WECHAT_NOTIFY_PORT,
      useFactory: (mini: WechatMiniNotifyDriver, official: WechatOfficialNotifyDriver) => [
        mini,
        official,
      ],
      inject: [WechatMiniNotifyDriver, WechatOfficialNotifyDriver],
    },
    { provide: WECHAT_OFFICIAL_AUTH_PORT, useExisting: WechatOfficialNotifyDriver },
    OrderWechatNotifyService,
    GetMyWechatBindingsUseCase,
    BindWechatUseCase,
    UnbindWechatUseCase,
    GetWechatAuthorizeUrlUseCase,
  ],
  exports: [OrderWechatNotifyService],
})
export class NotifyModule {}
