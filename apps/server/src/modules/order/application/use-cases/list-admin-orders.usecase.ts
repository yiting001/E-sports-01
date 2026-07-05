import { Inject, Injectable } from '@nestjs/common';
import { AdminOrderView, PaginatedResult } from '@app/contracts';
import {
  AdminOrderFilter,
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { toAdminOrderView } from '../order.mapper';
import { ServiceAgentScope } from '../service-agent-scope.service';

/**
 * 用例：管理端分页检索订单（可按状态/订单号过滤），按创建时间倒序。
 * 客服角色强制按自身 serviceAgentId 过滤，仅见自己负责商品的订单。
 */
@Injectable()
export class ListAdminOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly scope: ServiceAgentScope,
  ) {}

  async execute(
    operatorId: string,
    page: number,
    pageSize: number,
    skip: number,
    filter: AdminOrderFilter,
  ): Promise<PaginatedResult<AdminOrderView>> {
    const agentId = await this.scope.resolveAgentId(operatorId);
    const [rows, total] = await this.orders.paginateAdmin(skip, pageSize, {
      ...filter,
      ...(agentId ? { serviceAgentId: agentId } : {}),
    });
    return { list: rows.map(toAdminOrderView), total, page, pageSize };
  }
}
