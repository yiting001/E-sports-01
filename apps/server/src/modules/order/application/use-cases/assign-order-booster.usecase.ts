import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminOrderView, OrderStatus } from '@app/contracts';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import { OrderEntity } from '../../domain/order.entity';
import { BoosterSelectionService } from '../../../booster/application/booster-selection.service';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { OrderGroupService } from '../order-group.service';
import { ServiceAgentScope } from '../service-agent-scope.service';
import { toAdminOrderView } from '../order.mapper';
import { assertRequestedBooster } from '../order-booster-selection';

/**
 * 用例：客服指派指定平台打手完成订单（待客服处理/待接单 → 服务中）。
 * 客服仅限自己负责的订单；被指派人须拥有打手角色、满足实名要求且押金缴足、不能是下单用户本人；
 * 指派成功后打手自动加入订单群并广播系统消息。
 */
@Injectable()
export class AssignOrderBoosterUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly scope: ServiceAgentScope,
    private readonly boosterSelection: BoosterSelectionService,
    private readonly orderGroup: OrderGroupService,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(operatorId: string, id: string, boosterId: string): Promise<AdminOrderView> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    await this.scope.assertCanHandle(operatorId, order);
    if (order.status !== OrderStatus.PendingService && order.status !== OrderStatus.Dispatching) {
      throw new BadRequestException('仅「待客服处理/待接单」订单可指派打手');
    }
    if (boosterId === order.userId) {
      throw new BadRequestException('不能指派下单用户本人');
    }
    assertRequestedBooster(order, boosterId);
    return this.tenant.run({ tenantId: order.tenantId, isSuper: false }, () =>
      this.assignWithinTenant(order, boosterId),
    );
  }

  private async assignWithinTenant(order: OrderEntity, boosterId: string): Promise<AdminOrderView> {
    const selected = order.serviceRegion
      ? await this.boosterSelection.assertSelectable(
          order.userId,
          boosterId,
          order.serviceRegion,
          order.tenantId,
        )
      : await this.boosterSelection.assertAssignable(order.userId, boosterId, order.tenantId);
    const saved = await this.orders.claimForServing({
      orderId: order.id,
      tenantId: order.tenantId,
      allowedStatuses: [OrderStatus.PendingService, OrderStatus.Dispatching],
      expectedRequestedBoosterId: order.requestedBoosterId,
      boosterId,
      boosterName: selected.displayName,
      acceptedAt: new Date(),
    });
    if (!saved) {
      throw new ConflictException('订单状态已变化，请刷新后重试');
    }
    await this.orderGroup.joinBooster(saved, boosterId);
    return toAdminOrderView(saved);
  }
}
