/** 提现订单仓储注入令牌 */
export const WITHDRAWAL_ORDER_REPOSITORY = Symbol('WITHDRAWAL_ORDER_REPOSITORY');

/** 提现订单仓储接口 */
export interface WithdrawalOrderRepository {
  /** 统计某钱包提现成功的笔数（供统计用） */
  countSuccessByWallet(walletId: string): Promise<number>;
}
