import type { PaymentProvider } from '../wallet/wallet';

/**
 * 服务订单（前后端共享契约）。
 * 用户在商品详情页下单 → 扫码支付（支付宝/微信）→ 支付成功进入「待客服处理」，
 * 后续由客服指派打手或下发接单大厅（后续迭代实现）。
 */

/** 订单状态（全流程预留，本期实现到「待客服处理」） */
export enum OrderStatus {
  /** 待付款（已创建未支付） */
  PendingPayment = 'pending_payment',
  /** 已支付，待客服处理（指派打手/下发大厅） */
  PendingService = 'pending_service',
  /** 已下发接单大厅，待打手接单 */
  Dispatching = 'dispatching',
  /** 服务中（打手已接单） */
  Serving = 'serving',
  /** 已完成 */
  Completed = 'completed',
  /** 已取消（仅待付款可取消） */
  Cancelled = 'cancelled',
}

/** 订单状态展示文案 */
export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: '待付款',
  [OrderStatus.PendingService]: '待客服处理',
  [OrderStatus.Dispatching]: '待接单',
  [OrderStatus.Serving]: '服务中',
  [OrderStatus.Completed]: '已完成',
  [OrderStatus.Cancelled]: '已取消',
};

/** 订单字段约束（DTO 校验与前端输入限制共享） */
export const ORDER_LIMITS = {
  remarkMax: 200,
  quantityMin: 1,
  quantityMax: 99,
  /** 备注附件（图片/视频）最大数量 */
  remarkMediaMax: 6,
  accountInfoMax: 200,
} as const;

/** 备注附件类型 */
export type RemarkMediaType = 'image' | 'video';

/** 备注附件（用户下单时上传的图片/视频） */
export interface RemarkMediaItem {
  type: RemarkMediaType;
  url: string;
}

/** 创建订单入参 */
export interface CreateOrderPayload {
  productId: string;
  /** 购买数量（局数/小时数），金额 = 单价 × 数量 */
  quantity: number;
  /** 支付渠道 */
  provider: PaymentProvider;
  /** 用户备注（大区/段位/开黑时间等，选填） */
  remark?: string;
  /** 备注附件（图片/视频，选填） */
  remarkMedia?: RemarkMediaItem[];
  /** 账号信息（选填；仅本人、接单打手与管理端可见，接单大厅不展示） */
  accountInfo?: string;
  /** 抵扣用的我的优惠券 id（选填，不用券不传） */
  userCouponId?: string;
}

/** 创建订单结果（扫码支付：二维码内容；0 元单直接支付成功无需扫码） */
export interface CreateOrderResult {
  orderId: string;
  orderNo: string;
  provider: PaymentProvider;
  /** 二维码内容（支付宝 qr_code / 微信 code_url），前端据此渲染二维码；0 元单为空串 */
  qrCode: string;
  /** 是否已支付完成（优惠抵扣到 0 元时免真实支付直接落账） */
  paid: boolean;
  amountFen: number;
  amountYuan: string;
  /** 折前原价（分） */
  originalAmountFen: number;
  /** 会员折扣（万分比，10000 = 未打折） */
  discountBp: number;
  /** 优惠券抵扣金额（分，未用券为 0） */
  couponDeductionFen: number;
}

/** 管理端进入订单群结果（幂等加入后返回群会话 id） */
export interface OrderGroupJoinResult {
  conversationId: string;
}

/** 管理端订单视图：在 C 端视图之上补充归属用户/客服快照/渠道交易号 */
export interface AdminOrderView extends OrderView {
  /** 下单用户 id */
  userId: string;
  /** 商品关联客服快照（未关联为空串） */
  serviceAgentId: string;
  /** 渠道交易号（未支付为空串） */
  providerTradeNo: string;
}

/** 订单视图（C 端我的订单） */
export interface OrderView {
  id: string;
  orderNo: string;
  productId: string;
  /** 商品标题快照（下单时固化，商品改名不影响历史订单） */
  productTitle: string;
  /** 商品封面快照 */
  productCover: string;
  quantity: number;
  amountFen: number;
  amountYuan: string;
  /** 折前原价（分）= 下单时单价 × 数量 */
  originalAmountFen: number;
  /** 下单时会员折扣快照（万分比，10000 = 未打折） */
  discountBp: number;
  /** 优惠券抵扣金额快照（分，未用券为 0） */
  couponDeductionFen: number;
  /** 打手提成金额（分，完成结算后回填；未结算为 0） */
  commissionFen: number;
  /** 打手提成费率快照（万分比，完成结算后回填；未结算为 0） */
  commissionRateBp: number;
  provider: PaymentProvider;
  status: OrderStatus;
  remark: string;
  /** 备注附件（图片/视频） */
  remarkMedia: RemarkMediaItem[];
  /** 账号信息（接单大厅视图中为空串，打手接单后可见） */
  accountInfo: string;
  /** 接单打手 id（接单/被指派后回填；未接单为空串） */
  boosterId: string;
  /** 接单打手显示名快照（接单/被指派时固化；未接单为空串） */
  boosterName: string;
  createdAt: string;
  /** 支付时间（未支付为空串） */
  paidAt: string;
  /** 下发接单大厅时间（未下发为空串） */
  dispatchedAt: string;
  /** 打手接单/被指派时间（未接单为空串） */
  acceptedAt: string;
  /** 服务完成时间（未完成为空串） */
  completedAt: string;
  /** 取消时间（未取消为空串） */
  cancelledAt: string;
  /** 订单群会话 id（支付成功自动建群后回填；未建群为空串） */
  conversationId: string;
}
