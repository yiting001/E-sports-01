import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderView } from '@app/contracts';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import { BoosterSelectionService } from '../../../booster/application/booster-selection.service';
import { BoosterAccess } from '../booster-access.service';
import { OrderGroupService } from '../order-group.service';
import { toBoosterOrderView } from '../order.mapper';
import { assertRequestedBooster } from '../order-booster-selection';

/**
 * 用例：打手在接单大厅接单（待接单 → 服务中，回填接单打手）；接单前校验实名要求与押金已缴足，
 * 接单后自动加入订单群并广播系统消息。
 */
@Injectable()
export class AcceptHallOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly boosterAccess: BoosterAccess,
    private readonly boosterSelection: BoosterSelectionService,
    private readonly orderGroup: OrderGroupService,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    await this.boosterAccess.assert(userId);
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.Dispatching) {
      throw new ConflictException('该订单已被接走或状态已变化');
    }
    if (order.userId === userId) {
      throw new BadRequestException('不能接自己的订单');
    }
    assertRequestedBooster(order, userId);
    const selected = order.serviceRegion
      ? await this.boosterSelection.assertSelectable(
          order.userId,
          userId,
          order.serviceRegion,
          order.tenantId,
        )
      : await this.boosterSelection.assertAssignable(order.userId, userId, order.tenantId);
    const saved = await this.orders.claimForServing({
      orderId: order.id,
      tenantId: order.tenantId,
      allowedStatuses: [OrderStatus.Dispatching],
      expectedRequestedBoosterId: order.requestedBoosterId,
      boosterId: userId,
      boosterName: selected.displayName,
      acceptedAt: new Date(),
    });
    if (!saved) {
      throw new ConflictException('该订单已被接走或状态已变化');
    }
    await this.orderGroup.joinBooster(saved, userId);
    return toBoosterOrderView(saved);
  }
}
