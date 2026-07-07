import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminOrderView, OrderStatus } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterDepositGuard } from '../../../booster/application/booster-deposit.service';
import { BoosterRealnameGuard } from '../../../booster/application/booster-realname.service';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { BoosterAccess } from '../booster-access.service';
import { OrderGroupService } from '../order-group.service';
import { ServiceAgentScope } from '../service-agent-scope.service';
import { toAdminOrderView } from '../order.mapper';

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
    private readonly boosterAccess: BoosterAccess,
    private readonly realnameGuard: BoosterRealnameGuard,
    private readonly depositGuard: BoosterDepositGuard,
    private readonly orderGroup: OrderGroupService,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    operatorId: string,
    id: string,
    boosterId: string,
  ): Promise<AdminOrderView> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    await this.scope.assertCanHandle(operatorId, order);
    if (
      order.status !== OrderStatus.PendingService &&
      order.status !== OrderStatus.Dispatching
    ) {
      throw new BadRequestException('仅「待客服处理/待接单」订单可指派打手');
    }
    if (boosterId === order.userId) {
      throw new BadRequestException('不能指派下单用户本人');
    }
    await this.boosterAccess.assert(boosterId);
    await this.realnameGuard.assertApproved(boosterId);
    await this.depositGuard.assertPaid(boosterId);
    const profiles = await this.users.resolveProfiles([boosterId]);
    const profile = profiles.get(boosterId);
    order.status = OrderStatus.Serving;
    order.boosterId = boosterId;
    order.boosterName = profile ? profile.nickname || profile.username : '';
    order.acceptedAt = new Date();
    const saved = await this.orders.save(order);
    await this.orderGroup.joinBooster(saved, boosterId);
    return toAdminOrderView(saved);
  }
}
