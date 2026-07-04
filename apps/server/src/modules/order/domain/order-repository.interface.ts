import type { OrderEntity } from './order.entity';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

/** 订单仓储接口（领域层只依赖抽象，实现在基础设施层，读操作按租户上下文过滤） */
export interface OrderRepository {
  /** 按主键取订单 */
  findById(id: string): Promise<OrderEntity | null>;
  /** 按商户订单号取订单（支付回调幂等定位用） */
  findByOrderNo(orderNo: string): Promise<OrderEntity | null>;
  /** 分页查询某用户的订单，按创建时间倒序 */
  paginateByUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[OrderEntity[], number]>;
  create(data: Partial<OrderEntity>): OrderEntity;
  save(entity: OrderEntity): Promise<OrderEntity>;
}
