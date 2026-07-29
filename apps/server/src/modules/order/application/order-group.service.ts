import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONVERSATION_MEMBER_TAGS, formatPublicUserDisplayName } from '@app/contracts';
import { GroupFacade, SystemGroupTitleSyncResult } from '../../im/application/group-facade.service';
import { UserDirectory } from '../../rbac/application/user-directory.service';
import { SUPER_ADMIN_ROLE, TENANT_ADMIN_ROLE } from '../../rbac/domain/rbac.constants';
import { OrderEntity } from '../domain/order.entity';
import { ORDER_REPOSITORY, OrderRepository } from '../domain/order-repository.interface';
import { buildOrderGroupTitle } from './order-group-title';

/** 拉入订单群的平台管理员人数上限（避免管理员过多时全员进群刷屏） */
const MAX_ADMIN_MEMBERS = 5;
/** CAS 冲突时重读订单状态，覆盖完整三阶段并发推进。 */
const TITLE_SYNC_MAX_ATTEMPTS = 3;

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

  /** 幂等地为已支付订单创建订单群；已建群时校正为当前真实状态标题。 */
  async ensureGroup(order: OrderEntity): Promise<void> {
    const latest = await this.ensureLinkedGroup(order);
    await this.syncTitle(latest);
  }

  /** 建群并恢复订单关联；稳定订单 UUID 让已建但失联的群可幂等找回。 */
  private async ensureLinkedGroup(order: OrderEntity): Promise<OrderEntity> {
    const latest = (await this.orders.findById(order.id)) ?? order;
    if (latest.conversationId) {
      order.conversationId = latest.conversationId;
      return latest;
    }
    const adminIds = await this.resolveAdminIds();
    const memberIds = [latest.userId, latest.serviceAgentId, latest.boosterId, ...adminIds];
    const ownerId = latest.serviceAgentId || adminIds[0] || latest.userId;
    const title = buildOrderGroupTitle(latest.productTitle, latest.status);
    const memberTags: Record<string, string> = {};
    for (const adminId of adminIds) {
      memberTags[adminId] = CONVERSATION_MEMBER_TAGS.admin;
    }
    if (latest.boosterId) {
      memberTags[latest.boosterId] = CONVERSATION_MEMBER_TAGS.booster;
    }
    if (latest.serviceAgentId) {
      memberTags[latest.serviceAgentId] = CONVERSATION_MEMBER_TAGS.agent;
    }
    memberTags[latest.userId] = CONVERSATION_MEMBER_TAGS.boss;
    const conversationId = await this.groups.ensureSystemGroup(
      latest.id,
      ownerId,
      title,
      memberIds,
      `订单 ${latest.orderNo} 已支付成功，客服将尽快为您安排服务`,
      memberTags,
    );
    await this.orders.updateConversationId(latest.id, conversationId);
    latest.conversationId = conversationId;
    order.conversationId = conversationId;
    return latest;
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
    try {
      await this.ensureGroup(order);
      if (!order.conversationId) {
        return;
      }
      const snapshotName = order.boosterName.trim();
      let name = snapshotName ? formatPublicUserDisplayName(boosterId, snapshotName) : '';
      if (name !== snapshotName) {
        name = '';
      }
      if (!name) {
        const names = await this.users.resolveDisplayNames([boosterId]);
        name = names.get(boosterId) ?? '打手';
      }
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

  /** 读取数据库最新订单状态后同步标题，失败不回滚已经提交的订单状态。 */
  async syncTitle(order: OrderEntity): Promise<void> {
    try {
      for (let attempt = 0; attempt < TITLE_SYNC_MAX_ATTEMPTS; attempt += 1) {
        const latest = await this.ensureLinkedGroup(order);
        const expectedTitle = buildOrderGroupTitle(latest.productTitle, latest.status);
        const result = await this.groups.syncSystemGroupTitle(latest.conversationId, expectedTitle);
        const confirmed = await this.orders.findById(order.id);
        if (!confirmed) {
          return;
        }
        const stateChangedDuringSync =
          !confirmed.conversationId ||
          confirmed.conversationId !== latest.conversationId ||
          buildOrderGroupTitle(confirmed.productTitle, confirmed.status) !== expectedTitle;
        if (result !== SystemGroupTitleSyncResult.Conflict && !stateChangedDuringSync) {
          return;
        }
      }
      throw new Error('订单群标题连续发生并发状态或写入冲突');
    } catch (error) {
      this.logger.error(
        `订单 ${order.orderNo} 群标题同步失败`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
