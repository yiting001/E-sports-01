import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONVERSATION_MEMBER_TAGS, OrderGroupJoinResult } from '@app/contracts';
import { GroupFacade } from '../../../im/application/group-facade.service';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order-repository.interface';
import { OrderPaymentSettleService } from '../order-payment.service';
import { ServiceAgentScope } from '../service-agent-scope.service';

/**
 * 用例：管理端进入订单群（幂等加入后返回会话 id）。
 * 客服仅限自己负责的订单；订单未建群（未支付）时报错提示。
 */
@Injectable()
export class JoinOrderGroupUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly scope: ServiceAgentScope,
    private readonly groups: GroupFacade,
    private readonly users: UserDirectory,
    private readonly payment: OrderPaymentSettleService,
  ) {}

  async execute(operatorId: string, orderId: string): Promise<OrderGroupJoinResult> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    await this.scope.assertCanHandle(operatorId, order);
    await this.payment.ensurePaidOrderGroup(order);
    if (!order.conversationId) {
      throw new BadRequestException('该订单尚未创建订单群（支付成功后自动创建）');
    }
    const names = await this.users.resolveDisplayNames([operatorId]);
    const name = names.get(operatorId);
    const isAgent = operatorId === order.serviceAgentId;
    const tag = isAgent ? CONVERSATION_MEMBER_TAGS.agent : CONVERSATION_MEMBER_TAGS.admin;
    const roleName = isAgent ? '客服' : '管理员';
    const actorName = name ? `${roleName} ${name}` : roleName;
    const notice = isAgent
      ? `${actorName} 已介入，将为您跟进处理，有问题请在群内留言`
      : `${actorName} 加入群聊`;
    await this.groups.joinGroup(order.conversationId, operatorId, notice, tag);
    return { conversationId: order.conversationId };
  }
}
