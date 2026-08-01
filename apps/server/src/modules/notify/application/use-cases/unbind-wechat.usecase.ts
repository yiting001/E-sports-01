import { Inject, Injectable } from '@nestjs/common';
import type { NotifyWechatChannel } from '@app/contracts';
import {
  WECHAT_BINDING_REPOSITORY,
  WechatBindingRepository,
} from '../../domain/wechat-binding-repository.interface';

/** 用例：解除本人某渠道的微信绑定（不存在时幂等成功） */
@Injectable()
export class UnbindWechatUseCase {
  constructor(
    @Inject(WECHAT_BINDING_REPOSITORY)
    private readonly bindings: WechatBindingRepository,
  ) {}

  execute(userId: string, channel: NotifyWechatChannel): Promise<void> {
    return this.bindings.removeByUserChannel(userId, channel);
  }
}
