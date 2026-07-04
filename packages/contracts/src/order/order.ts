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
} as const;

/** 创建订单入参 */
export interface CreateOrderPayload {
  productId: string;
  /** 购买数量（局数/小时数），金额 = 单价 × 数量 */
  quantity: number;
  /** 支付渠道 */
  provider: PaymentProvider;
  /** 用户备注（大区/段位/开黑时间等，选填） */
  remark?: string;
}

/** 创建订单结果（扫码支付：二维码内容） */
export interface CreateOrderResult {
  orderId: string;
  orderNo: string;
  provider: PaymentProvider;
  /** 二维码内容（支付宝 qr_code / 微信 code_url），前端据此渲染二维码 */
  qrCode: string;
  amountFen: number;
  amountYuan: string;
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
  provider: PaymentProvider;
  status: OrderStatus;
  remark: string;
  createdAt: string;
  /** 支付时间（未支付为空串） */
  paidAt: string;
}
