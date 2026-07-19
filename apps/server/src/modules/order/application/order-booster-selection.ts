import { BadRequestException } from '@nestjs/common';
import { OrderBoosterSelectionMode } from '@app/contracts';
import type { OrderEntity } from '../domain/order.entity';

/** 指定打手订单不能进入公共大厅，避免被其他打手领取。 */
export function assertOrderCanDispatch(order: OrderEntity): void {
  if (
    order.boosterSelectionMode === OrderBoosterSelectionMode.Specified ||
    order.requestedBoosterId
  ) {
    throw new BadRequestException('指定打手订单不能下发大厅，请直接确认指派');
  }
}

/** 指定订单的最终履约人必须与老板选择一致。 */
export function assertRequestedBooster(order: OrderEntity, boosterId: string): void {
  if (order.requestedBoosterId && order.requestedBoosterId !== boosterId) {
    throw new BadRequestException('该订单只能指派给老板指定的打手');
  }
}
