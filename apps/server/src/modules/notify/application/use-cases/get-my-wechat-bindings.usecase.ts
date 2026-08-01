import { Inject, Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  type MyWechatBindingsView,
  type WechatBindingView,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  WECHAT_BINDING_REPOSITORY,
  WechatBindingRepository,
} from '../../domain/wechat-binding-repository.interface';
import type { WechatBindingEntity } from '../../domain/wechat-binding.entity';

/** openid 只保留末四位，避免向前端回显完整第三方标识 */
export function maskOpenid(openid: string): string {
  return `****${openid.slice(-4)}`;
}

export function toBindingView(entity: WechatBindingEntity): WechatBindingView {
  return {
    channel: entity.channel,
    openidMasked: maskOpenid(entity.openid),
    boundAt: entity.createdAt.toISOString(),
  };
}

/** 用例：查询本人微信绑定概览（含平台微信通知开关，用于前端显隐绑定入口） */
@Injectable()
export class GetMyWechatBindingsUseCase {
  constructor(
    @Inject(WECHAT_BINDING_REPOSITORY)
    private readonly bindings: WechatBindingRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: string): Promise<MyWechatBindingsView> {
    const [enabled, records] = await Promise.all([
      this.config.getBoolean(CONFIG_KEYS.notify.wechatEnabled, false),
      this.bindings.findByUser(userId),
    ]);
    return { enabled, bindings: records.map(toBindingView) };
  }
}
