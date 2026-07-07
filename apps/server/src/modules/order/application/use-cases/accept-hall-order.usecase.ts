import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderView } from '@app/contracts';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterDepositGuard } from '../../../booster/application/booster-deposit.service';
import { BoosterRealnameGuard } from '../../../booster/application/booster-realname.service';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { BoosterAccess } from '../booster-access.service';
import { OrderGroupService } from '../order-group.service';
import { toOrderView } from '../order.mapper';

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
    private readonly realnameGuard: BoosterRealnameGuard,
    private readonly depositGuard: BoosterDepositGuard,
    private readonly orderGroup: OrderGroupService,
    private readonly users: UserDirectory,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    await this.boosterAccess.assert(userId);
    await this.realnameGuard.assertApproved(userId);
    await this.depositGuard.assertPaid(userId);
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.Dispatching) {
      throw new BadRequestException('该订单已被接走或不可接单');
    }
    if (order.userId === userId) {
      throw new BadRequestException('不能接自己的订单');
    }
    const profiles = await this.users.resolveProfiles([userId]);
    const profile = profiles.get(userId);
    order.status = OrderStatus.Serving;
    order.boosterId = userId;
    order.boosterName = profile ? profile.nickname || profile.username : '';
    order.acceptedAt = new Date();
    const saved = await this.orders.save(order);
    await this.orderGroup.joinBooster(saved, userId);
    return toOrderView(saved);
  }
}
