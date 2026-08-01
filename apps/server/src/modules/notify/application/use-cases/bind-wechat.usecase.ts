import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NotifyWechatChannel, type WechatBindingView } from '@app/contracts';
import {
  WECHAT_BINDING_REPOSITORY,
  WechatBindingRepository,
} from '../../domain/wechat-binding-repository.interface';
import {
  WECHAT_NOTIFY_PORT,
  WechatNotifyPort,
} from '../../domain/wechat-notify-port.interface';
import { toBindingView } from './get-my-wechat-bindings.usecase';

/**
 * 用例：用微信授权 code 绑定通知渠道。
 * openid 由服务端向微信换取，客户端不能直接提交 openid；同渠道重复绑定覆盖更新。
 */
@Injectable()
export class BindWechatUseCase {
  constructor(
    @Inject(WECHAT_NOTIFY_PORT) private readonly ports: WechatNotifyPort[],
    @Inject(WECHAT_BINDING_REPOSITORY)
    private readonly bindings: WechatBindingRepository,
  ) {}

  async execute(
    userId: string,
    channel: NotifyWechatChannel,
    code: string,
  ): Promise<WechatBindingView> {
    const port = this.ports.find((candidate) => candidate.channel === channel);
    if (!port) {
      throw new BadRequestException('不支持的通知渠道');
    }
    const openid = await port.exchangeOpenid(code);
    const saved = await this.bindings.upsert(userId, channel, openid);
    return toBindingView(saved);
  }
}
