import { FEE_RATE_BASE, OrderStatus, PaymentProvider } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { bigintTransformer } from '../../../shared/database/numeric.transformer';

/**
 * 服务订单聚合根。
 * 用户下单陪玩/代打服务的凭据：固化商品标题/封面/客服快照，
 * 以商户订单号 orderNo 全局唯一，作为支付回调的幂等键。
 */
@Entity('service_order')
export class OrderEntity extends TenantScopedEntity {
  /** 下单用户 id */
  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId!: string;

  /** 商户订单号（提交给支付渠道并在回调中带回，幂等键） */
  @Index({ unique: true })
  @Column({ name: 'order_no', length: 64 })
  orderNo!: string;

  /** 商品 id */
  @Index()
  @Column({ name: 'product_id', length: 36 })
  productId!: string;

  /** 商品标题快照（下单时固化） */
  @Column({ name: 'product_title', length: 128 })
  productTitle!: string;

  /** 商品封面快照 */
  @Column({ name: 'product_cover', length: 512, default: '' })
  productCover!: string;

  /** 商品关联客服快照（后续拉群/指派用；未关联为空串） */
  @Column({ name: 'service_agent_id', length: 36, default: '' })
  serviceAgentId!: string;

  /** 接单打手 id（接单后回填；未接单为空串） */
  @Index()
  @Column({ name: 'booster_id', length: 36, default: '' })
  boosterId!: string;

  /** 订单群会话 id（支付成功自动建群后回填；未建群为空串） */
  @Column({ name: 'conversation_id', length: 36, default: '' })
  conversationId!: string;

  /** 购买数量（局数/小时数） */
  @Column({ type: 'int', default: 1 })
  quantity!: number;

  /** 订单金额（分）= 下单时单价 × 数量，再按会员折扣后的实付额 */
  @Column({ name: 'amount_fen', type: 'bigint', transformer: bigintTransformer })
  amountFen!: number;

  /** 折前原价（分）= 下单时单价 × 数量 */
  @Column({ name: 'original_amount_fen', type: 'bigint', default: 0, transformer: bigintTransformer })
  originalAmountFen!: number;

  /** 下单时会员折扣快照（万分比，10000 = 未打折） */
  @Column({ name: 'discount_bp', type: 'int', default: FEE_RATE_BASE })
  discountBp!: number;

  /** 抵扣用的用户券 id（未用券为 null，取消订单据此回退） */
  @Column({ name: 'user_coupon_id', type: 'varchar', length: 36, nullable: true })
  userCouponId!: string | null;

  /** 优惠券抵扣金额快照（分，未用券为 0） */
  @Column({ name: 'coupon_deduction_fen', type: 'bigint', default: 0, transformer: bigintTransformer })
  couponDeductionFen!: number;

  /** 打手提成金额（分，完成结算时回填） */
  @Column({ name: 'commission_fen', type: 'bigint', default: 0, transformer: bigintTransformer })
  commissionFen!: number;

  /** 提成费率快照（万分比，完成结算时按打手当时等级回填） */
  @Column({ name: 'commission_rate_bp', type: 'int', default: 0 })
  commissionRateBp!: number;

  /** 支付渠道 */
  @Column({ type: 'varchar', length: 16 })
  provider!: PaymentProvider;

  /** 订单状态 */
  @Index()
  @Column({ type: 'varchar', length: 24, default: OrderStatus.PendingPayment })
  status!: OrderStatus;

  /** 用户备注（大区/段位/开黑时间等） */
  @Column({ length: 256, default: '' })
  remark!: string;

  /** 渠道交易号（支付成功后回填） */
  @Column({ name: 'provider_trade_no', type: 'varchar', length: 64, nullable: true })
  providerTradeNo!: string | null;

  /** 支付时间（支付成功后回填） */
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;
}
