import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderStatus,
} from '@app/contracts';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { toHallOrderView } from '../../src/modules/order/application/order.mapper';
import {
  assertOrderCanDispatch,
  assertRequestedBooster,
} from '../../src/modules/order/application/order-booster-selection';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';
import { CreateOrderDto } from '../../src/modules/order/interfaces/dto/create-order.dto';

test('下单 DTO 校验数字游戏 ID、区服及 specified 必填打手 id', async () => {
  const valid = plainToInstance(CreateOrderDto, {
    productId: 'product-1',
    quantity: 1,
    provider: OrderPaymentMethod.Balance,
    gameAccountId: ' 123456 ',
    gameTextId: ' text-id ',
    serviceRegion: 'delta-mobile',
    boosterSelectionMode: OrderBoosterSelectionMode.Specified,
    requestedBoosterId: '11111111-1111-4111-8111-111111111111',
  });
  assert.equal((await validate(valid)).length, 0);
  assert.equal(valid.gameAccountId, '123456');
  assert.equal(valid.gameTextId, 'text-id');

  const invalid = plainToInstance(CreateOrderDto, {
    productId: 'product-1',
    quantity: 1,
    provider: OrderPaymentMethod.Balance,
    gameAccountId: 'abc-123',
    serviceRegion: 'unknown-region',
    boosterSelectionMode: OrderBoosterSelectionMode.Specified,
  });
  const properties = new Set((await validate(invalid)).map((error) => error.property));
  assert.ok(properties.has('gameAccountId'));
  assert.ok(properties.has('serviceRegion'));
  assert.ok(properties.has('requestedBoosterId'));
});

test('接单大厅投影隐藏新旧游戏账号字段', () => {
  const order = Object.assign(new OrderEntity(), {
    id: 'order-1',
    tenantId: 'tenant-1',
    orderNo: 'ORDER-1',
    productId: 'product-1',
    productTitle: '陪玩服务',
    productCover: '',
    quantity: 1,
    amountFen: 100,
    originalAmountFen: 100,
    discountBp: 10_000,
    couponDeductionFen: 0,
    commissionFen: 0,
    commissionRateBp: 0,
    provider: OrderPaymentMethod.Balance,
    status: OrderStatus.Dispatching,
    remark: '',
    remarkMedia: [],
    accountInfo: 'legacy-secret',
    gameAccountId: '123456',
    gameTextId: 'text-secret',
    serviceRegion: 'delta-mobile',
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
    requestedBoosterId: '',
    requestedBoosterName: '',
    boosterId: '',
    boosterName: '',
    conversationId: '',
    createdAt: new Date('2026-07-17T00:00:00.000Z'),
    paidAt: new Date('2026-07-17T00:01:00.000Z'),
    dispatchedAt: new Date('2026-07-17T00:02:00.000Z'),
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
  });

  const view = toHallOrderView(order);
  assert.equal(view.accountInfo, '');
  assert.equal(view.gameAccountId, '');
  assert.equal(view.gameTextId, '');
  assert.equal(view.serviceRegion, 'delta-mobile');
});

test('指定打手订单禁止进入公共大厅且不能改派其他人', () => {
  const specified = Object.assign(new OrderEntity(), {
    boosterSelectionMode: OrderBoosterSelectionMode.Specified,
    requestedBoosterId: 'booster-1',
  });
  const automatic = Object.assign(new OrderEntity(), {
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
    requestedBoosterId: '',
  });

  assert.throws(() => assertOrderCanDispatch(specified), /指定打手订单不能下发大厅/);
  assert.throws(
    () => assertRequestedBooster(specified, 'booster-2'),
    /只能指派给老板指定的打手/,
  );
  assert.doesNotThrow(() => assertRequestedBooster(specified, 'booster-1'));
  assert.doesNotThrow(() => assertOrderCanDispatch(automatic));
});
