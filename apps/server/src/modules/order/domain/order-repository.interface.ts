import type { OrderStatus } from '@app/contracts';
import type { OrderEntity } from './order.entity';

/** 管理端订单检索条件 */
export interface AdminOrderFilter {
  /** 按状态过滤 */
  status?: OrderStatus;
  /** 按商户订单号精确定位 */
  orderNo?: string;
  /** 按负责客服过滤（客服角色强制限定为自身，仅见自己负责商品的订单） */
  serviceAgentId?: string;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface ClaimOrderForServingInput {
  orderId: string;
  tenantId: string;
  allowedStatuses: readonly OrderStatus[];
  expectedRequestedBoosterId: string;
  boosterId: string;
  boosterName: string;
  acceptedAt: Date;
}

export interface ClaimOrderForDispatchInput {
  orderId: string;
  tenantId: string;
  dispatchedAt: Date;
}

export interface ClaimOrderForCancellationInput {
  orderId: string;
  tenantId: string;
  userId: string;
  cancelledAt: Date;
}

/** 订单仓储接口（领域层只依赖抽象，实现在基础设施层，读操作按租户上下文过滤） */
export interface OrderRepository {
  /** 按主键取订单 */
  findById(id: string): Promise<OrderEntity | null>;
  /** 按商户订单号取订单（支付回调幂等定位用） */
  findByOrderNo(orderNo: string): Promise<OrderEntity | null>;
  /** 分页查询某用户的订单（可按状态过滤），按创建时间倒序 */
  paginateByUser(
    userId: string,
    skip: number,
    take: number,
    status?: OrderStatus,
  ): Promise<[OrderEntity[], number]>;
  /** 分页查询接单大厅订单（状态为待接单），按创建时间倒序 */
  paginateDispatching(skip: number, take: number): Promise<[OrderEntity[], number]>;
  /** 分页查询某打手接下的订单（可按状态过滤），按创建时间倒序 */
  paginateByBooster(
    boosterId: string,
    skip: number,
    take: number,
    status?: OrderStatus,
  ): Promise<[OrderEntity[], number]>;
  /** 管理端分页检索全量订单（租户内），按创建时间倒序 */
  paginateAdmin(
    skip: number,
    take: number,
    filter: AdminOrderFilter,
  ): Promise<[OrderEntity[], number]>;
  create(data: Partial<OrderEntity>): OrderEntity;
  save(entity: OrderEntity): Promise<OrderEntity>;
  /** 仅回填订单群关联，禁止用支付后的旧实体整行保存覆盖并发状态。 */
  updateConversationId(id: string, conversationId: string): Promise<void>;
  /** 行锁内把自动安排的待客服订单推进至大厅；与退款申请竞争时仅一方成功。 */
  claimForDispatch(input: ClaimOrderForDispatchInput): Promise<OrderEntity | null>;
  /** 行锁内仅把本人的待付款订单置为已取消；与支付落账竞争时仅一方成功。 */
  claimForCancellation(input: ClaimOrderForCancellationInput): Promise<OrderEntity | null>;
  /** 行锁内复核订单状态与指定人后原子推进到服务中；竞争失败返回 null。 */
  claimForServing(input: ClaimOrderForServingInput): Promise<OrderEntity | null>;
}
