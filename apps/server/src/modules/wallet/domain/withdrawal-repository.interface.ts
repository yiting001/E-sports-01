import { WithdrawalStatus } from '@app/contracts';
import { WithdrawalOrderEntity } from './withdrawal-order.entity';

/** 提现订单仓储注入令牌 */
export const WITHDRAWAL_ORDER_REPOSITORY = Symbol('WITHDRAWAL_ORDER_REPOSITORY');

/** 提现订单仓储接口 */
export interface WithdrawalOrderRepository {
  /** 统计某钱包提现成功的笔数（供统计用） */
  countSuccessByWallet(walletId: string): Promise<number>;

  /** 按 id 查询提现订单（当前租户内） */
  findById(id: string): Promise<WithdrawalOrderEntity | null>;

  /** 按钱包分页查询提现订单（C 端我的提现记录，按创建时间倒序） */
  paginateByWallet(
    walletId: string,
    skip: number,
    take: number,
  ): Promise<[WithdrawalOrderEntity[], number]>;

  /** 管理端分页查询提现订单（可按状态过滤，按创建时间倒序） */
  paginate(
    skip: number,
    take: number,
    status?: WithdrawalStatus,
  ): Promise<[WithdrawalOrderEntity[], number]>;
}
