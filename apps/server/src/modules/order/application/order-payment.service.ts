import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrderPaymentMethod } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { MemberProgressService } from '../../member/application/member-progress.service';
import { OrderEntity } from '../domain/order.entity';
import {
  ORDER_PAYMENT_SETTLEMENT,
  OrderPaymentSettlement,
} from '../domain/order-payment-settlement.interface';
import { OrderGroupService } from './order-group.service';

/**
 * 订单支付落账服务（回调与主动查单共用的唯一落账口）。
 * 事务 + 行锁内以 orderNo 幂等定位订单：仅「待付款且金额一致」时
 * 标记已支付进入「待客服处理」，并累加商品销量与用户会员累计消费；
 * 落账后自动创建订单沟通群（用户 + 商品关联客服 + 平台管理员）；
 * 重复落账（回调与查单并发）安全无副作用。
 */
@Injectable()
export class OrderPaymentSettleService {
  private readonly logger = new Logger(OrderPaymentSettleService.name);

  constructor(
    @Inject(ORDER_PAYMENT_SETTLEMENT)
    private readonly settlement: OrderPaymentSettlement,
    private readonly memberProgress: MemberProgressService,
    private readonly orderGroup: OrderGroupService,
    private readonly tenant: TenantContextService,
  ) {}

  async markPaid(
    orderNo: string,
    method: OrderPaymentMethod,
    providerTradeNo: string,
    paidAmountFen: number,
  ): Promise<void> {
    const paidOrder = await this.settlement.settle({
      orderNo,
      method,
      providerTradeNo,
      paidAmountFen,
    });
    await this.runPostCommitEffects(paidOrder, paidAmountFen);
  }

  /** 钱包余额支付：核心落账异常向上抛；提交后副作用失败不回滚已支付订单。 */
  async payWithBalance(orderId: string, userId: string, paidAmountFen: number): Promise<void> {
    const paidOrder = await this.settlement.settleBalance({
      orderId,
      userId,
      paidAmountFen,
    });
    await this.runPostCommitEffects(paidOrder, paidAmountFen);
  }

  /** 查询入口补偿：已支付订单幂等补建群或校正状态标题，不重复累计消费。 */
  async ensurePaidOrderGroup(order: OrderEntity): Promise<void> {
    if (!order.paidAt) {
      return;
    }
    await this.tenant.run({ tenantId: order.tenantId, isSuper: false }, () =>
      this.ensureGroupSafely(order),
    );
  }

  private async runPostCommitEffects(
    paidOrder: OrderEntity | null,
    paidAmountFen: number,
  ): Promise<void> {
    if (!paidOrder) {
      return;
    }
    await this.tenant.run({ tenantId: paidOrder.tenantId, isSuper: false }, () =>
      this.runScopedPostCommitEffects(paidOrder, paidAmountFen),
    );
  }

  /** 渠道回调是公开路由，提交后副作用必须恢复订单租户作用域。 */
  private async runScopedPostCommitEffects(
    paidOrder: OrderEntity,
    paidAmountFen: number,
  ): Promise<void> {
    try {
      await this.memberProgress.recordSpend(paidOrder.userId, paidAmountFen);
    } catch (error) {
      this.logger.error(
        `订单 ${paidOrder.orderNo} 累计会员消费失败`,
        error instanceof Error ? error.stack : String(error),
      );
    }
    await this.ensureGroupSafely(paidOrder);
  }

  private async ensureGroupSafely(paidOrder: OrderEntity): Promise<void> {
    try {
      await this.orderGroup.ensureGroup(paidOrder);
    } catch (error) {
      this.logger.error(
        `订单 ${paidOrder.orderNo} 支付后建群失败`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
