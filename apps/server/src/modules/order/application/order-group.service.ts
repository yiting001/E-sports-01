import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONVERSATION_MEMBER_TAGS } from '@app/contracts';
import { GroupFacade } from '../../im/application/group-facade.service';
import { UserDirectory } from '../../rbac/application/user-directory.service';
import { SUPER_ADMIN_ROLE, TENANT_ADMIN_ROLE } from '../../rbac/domain/rbac.constants';
import { OrderEntity } from '../domain/order.entity';
import { ORDER_REPOSITORY, OrderRepository } from '../domain/order-repository.interface';

/** 拉入订单群的平台管理员人数上限（避免管理员过多时全员进群刷屏） */
const MAX_ADMIN_MEMBERS = 5;

/**
 * 订单群服务。
 * 支付成功后为订单自动创建沟通群：下单用户 + 商品关联客服 + 平台管理员，
 * 群会话 id 回填订单；打手接单/被指派后自动加入该群并广播系统消息。
 * 建群/进群失败仅记日志，不阻断支付落账与接单主流程。
 */
@Injectable()
export class OrderGroupService {
  private readonly logger = new Logger(OrderGroupService.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly groups: GroupFacade,
    private readonly users: UserDirectory,
  ) {}

  /** 拉平台管理员入群：优先租户管理员，无租户管理员时回退超管，保证后台可见订单群 */
  private async resolveAdminIds(): Promise<string[]> {
    for (const role of [TENANT_ADMIN_ROLE, SUPER_ADMIN_ROLE]) {
      const [admins] = await this.users.paginateProfilesByRole(role, 0, MAX_ADMIN_MEMBERS);
      if (admins.length > 0) {
        return admins.map((a) => a.id);
      }
    }
    return [];
  }

  /** 幂等地为已支付订单创建订单群（已建过则跳过），返回会话 id */
  async ensureGroup(order: OrderEntity): Promise<void> {
    if (order.conversationId) {
      return;
    }
    const adminIds = await this.resolveAdminIds();
    const memberIds = [order.userId, order.serviceAgentId, order.boosterId, ...adminIds];
    const ownerId = order.serviceAgentId || adminIds[0] || order.userId;
    const title = `订单群·${order.productTitle}`;
    const memberTags: Record<string, string> = {};
    for (const adminId of adminIds) {
      memberTags[adminId] = CONVERSATION_MEMBER_TAGS.admin;
    }
    if (order.boosterId) {
      memberTags[order.boosterId] = CONVERSATION_MEMBER_TAGS.booster;
    }
    if (order.serviceAgentId) {
      memberTags[order.serviceAgentId] = CONVERSATION_MEMBER_TAGS.agent;
    }
    memberTags[order.userId] = CONVERSATION_MEMBER_TAGS.boss;
    const conversationId = await this.groups.ensureSystemGroup(
      order.id,
      ownerId,
      title,
      memberIds,
      `订单 ${order.orderNo} 已支付成功，客服将尽快为您安排服务`,
      memberTags,
    );
    order.conversationId = conversationId;
    await this.orders.save(order);
  }

  /** 订单完成后向订单群广播服务结束系统消息（失败仅记日志，不阻断完成主流程） */
  async notifyCompleted(order: OrderEntity): Promise<void> {
    if (!order.conversationId) {
      return;
    }
    try {
      await this.groups.postSystemNotice(
        order.conversationId,
        `订单 ${order.orderNo} 已完成，本次客服会话已结束，感谢您的支持`,
      );
    } catch (err) {
      this.logger.error(
        `订单 ${order.orderNo} 完成通知发送失败`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** 打手接单/被指派后加入订单群并广播系统消息 */
  async joinBooster(order: OrderEntity, boosterId: string): Promise<void> {
    if (!order.conversationId) {
      return;
    }
    try {
      const names = await this.users.resolveNames([boosterId]);
      const name = names.get(boosterId) ?? boosterId;
      await this.groups.joinGroup(
        order.conversationId,
        boosterId,
        `打手 ${name} 已接单，加入群聊为您服务`,
        CONVERSATION_MEMBER_TAGS.booster,
      );
    } catch (err) {
      this.logger.error(
        `订单 ${order.orderNo} 打手进群失败`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
