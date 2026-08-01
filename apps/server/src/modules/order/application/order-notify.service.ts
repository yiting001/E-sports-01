import { Injectable, Logger } from '@nestjs/common';
import { NOTIFY_LIMITS, type OrderNotifyPayload } from '@app/contracts';
import { BoosterCandidateService } from '../../booster/application/booster-candidate.service';
import { OrderWechatNotifyService } from '../../notify/application/order-wechat-notify.service';
import { UserDirectory } from '../../rbac/application/user-directory.service';
import { SUPER_ADMIN_ROLE, TENANT_ADMIN_ROLE } from '../../rbac/domain/rbac.constants';
import { OrderEntity } from '../domain/order.entity';

/** 通知类订单事件的标题文案（微信模板的 title 字段来源） */
const NOTIFY_TITLES = {
  hallOrder: '接单大厅有新订单',
  pendingOrder: '有新订单待处理',
} as const;

/** 金额展示：分 → 元（保留两位） */
function formatAmount(amountFen: number): string {
  return `${(amountFen / 100).toFixed(2)}元`;
}

/** 时间展示：本地可读格式（微信模板字段不接受 ISO 里的 T/Z 观感） */
function formatTime(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * 订单事件微信通知编排（订单模块侧）。
 * 只负责解析收件人（上线打手 / 管理员与客服）并装配通知内容，
 * 发送与渠道细节全部委托 notify 模块；任何失败只记日志，不影响订单流程。
 */
@Injectable()
export class OrderNotifyService {
  private readonly logger = new Logger(OrderNotifyService.name);

  constructor(
    private readonly wechatNotify: OrderWechatNotifyService,
    private readonly boosterCandidates: BoosterCandidateService,
    private readonly users: UserDirectory,
  ) {}

  /** 订单进入接单大厅：通知当前租户已上线的打手 */
  async notifyHallOrder(order: OrderEntity): Promise<void> {
    try {
      const [candidates] = await this.boosterCandidates.paginate(
        0,
        NOTIFY_LIMITS.wechatRecipientsMax,
      );
      await this.wechatNotify.notifyUsers(
        candidates.map((candidate) => candidate.id),
        this.buildPayload(order, NOTIFY_TITLES.hallOrder),
      );
    } catch (error) {
      this.logger.error(
        `订单 ${order.orderNo} 大厅通知失败`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** 订单支付成功待处理：通知商品关联客服与平台管理员 */
  async notifyPendingOrder(order: OrderEntity): Promise<void> {
    try {
      const recipients = new Set<string>();
      if (order.serviceAgentId) {
        recipients.add(order.serviceAgentId);
      }
      for (const role of [TENANT_ADMIN_ROLE, SUPER_ADMIN_ROLE]) {
        const [admins] = await this.users.paginateProfilesByRole(
          role,
          0,
          NOTIFY_LIMITS.wechatRecipientsMax,
        );
        if (admins.length > 0) {
          admins.forEach((admin) => recipients.add(admin.id));
          break;
        }
      }
      await this.wechatNotify.notifyUsers(
        [...recipients],
        this.buildPayload(order, NOTIFY_TITLES.pendingOrder),
      );
    } catch (error) {
      this.logger.error(
        `订单 ${order.orderNo} 待处理通知失败`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private buildPayload(order: OrderEntity, title: string): OrderNotifyPayload {
    return {
      title,
      orderNo: order.orderNo,
      product: order.productTitle,
      amount: formatAmount(order.amountFen),
      time: formatTime(new Date()),
      remark: '请及时登录平台查看处理',
    };
  }
}
