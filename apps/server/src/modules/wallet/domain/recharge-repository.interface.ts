import { RechargeOrderEntity } from './recharge-order.entity';

/** 充值订单仓储注入令牌 */
export const RECHARGE_ORDER_REPOSITORY = Symbol('RECHARGE_ORDER_REPOSITORY');

/** 充值订单仓储接口 */
export interface RechargeOrderRepository {
  save(order: RechargeOrderEntity): Promise<RechargeOrderEntity>;
  /** 按商户订单号查找（主动查单用） */
  findByOutTradeNo(outTradeNo: string): Promise<RechargeOrderEntity | null>;
  /** 统计某钱包已支付的充值笔数（供统计用） */
  countPaidByWallet(walletId: string): Promise<number>;
}
