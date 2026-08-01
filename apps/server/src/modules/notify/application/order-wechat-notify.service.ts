import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CONFIG_KEYS,
  NOTIFY_LIMITS,
  NOTIFY_WECHAT_CHANNEL_VALUES,
  type OrderNotifyPayload,
} from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import {
  WECHAT_BINDING_REPOSITORY,
  WechatBindingRepository,
} from '../domain/wechat-binding-repository.interface';
import {
  WECHAT_NOTIFY_PORT,
  WechatNotifyPort,
} from '../domain/wechat-notify-port.interface';

/**
 * 订单微信通知编排。
 * 按渠道解析收件人的绑定 openid 并逐个发送；总开关关闭、渠道未配置或
 * 无绑定时静默跳过。所有失败只记日志，绝不向业务主流程抛出。
 */
@Injectable()
export class OrderWechatNotifyService {
  private readonly logger = new Logger(OrderWechatNotifyService.name);

  constructor(
    @Inject(WECHAT_NOTIFY_PORT) private readonly ports: WechatNotifyPort[],
    @Inject(WECHAT_BINDING_REPOSITORY)
    private readonly bindings: WechatBindingRepository,
    private readonly config: ConfigService,
  ) {}

  /** 向指定用户集合发送订单通知（当前租户上下文内解析绑定） */
  async notifyUsers(userIds: string[], payload: OrderNotifyPayload): Promise<void> {
    try {
      if (userIds.length === 0) {
        return;
      }
      const enabled = await this.config.getBoolean(CONFIG_KEYS.notify.wechatEnabled, false);
      if (!enabled) {
        return;
      }
      const recipients = userIds.slice(0, NOTIFY_LIMITS.wechatRecipientsMax);
      for (const channel of NOTIFY_WECHAT_CHANNEL_VALUES) {
        await this.notifyChannel(channel, recipients, payload);
      }
    } catch (error) {
      this.logger.error(
        `订单微信通知发送失败（订单 ${payload.orderNo}）`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async notifyChannel(
    channel: string,
    userIds: string[],
    payload: OrderNotifyPayload,
  ): Promise<void> {
    const port = this.ports.find((candidate) => candidate.channel === channel);
    if (!port || !(await port.isConfigured())) {
      return;
    }
    const bindings = await this.bindings.findByUsers(userIds, port.channel);
    for (const binding of bindings) {
      try {
        await port.sendOrderNotification({ openid: binding.openid, payload });
      } catch (error) {
        // 单个收件人失败不影响其他人；日志不记录 openid 明文
        this.logger.warn(
          `微信通知单发失败（渠道 ${port.channel}，订单 ${payload.orderNo}）：` +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }
  }
}
