/**
 * 订单契约的最小镜像（单一来源：packages/contracts/src/order/order.ts）。
 * 仅镜像本工程页面消费的字段；接入 pnpm workspace 后删除本文件，
 * 改为 `import { OrderStatus, ORDER_STATUS_TEXT, ... } from '@app/contracts'`。
 */

import type { BoosterServiceRegion } from './booster';
import type { PaginatedResult } from './commerce';

/** 订单支付方式（小程序端可用余额支付；渠道支付依赖服务端小程序支付渠道） */
export enum OrderPaymentMethod {
  Alipay = 'alipay',
  Wechat = 'wechat',
  /** 微信公众号 JSAPI 支付 */
  WechatJsapi = 'wechat_jsapi',
  /** 余额支付 */
  Balance = 'balance',
}

/** 打手安排方式（小程序端仅支持自动安排） */
export enum OrderBoosterSelectionMode {
  Auto = 'auto',
  Specified = 'specified',
}

/** 订单状态 */
export enum OrderStatus {
  /** 待付款（已创建未支付） */
  PendingPayment = 'pending_payment',
  /** 已支付，待客服处理 */
  PendingService = 'pending_service',
  /** 已下发接单大厅，待打手接单 */
  Dispatching = 'dispatching',
  /** 服务中（打手已接单） */
  Serving = 'serving',
  /** 已完成 */
  Completed = 'completed',
  /** 用户已申请退款，等待审核 */
  RefundReviewing = 'refund_reviewing',
  /** 已全额退款 */
  Refunded = 'refunded',
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
  [OrderStatus.RefundReviewing]: '退款处理中',
  [OrderStatus.Refunded]: '已退款',
  [OrderStatus.Cancelled]: '已取消',
};

/** 备注附件（用户下单时上传） */
export type RemarkMediaType = 'image' | 'video';

export interface RemarkMediaItem {
  type: RemarkMediaType;
  url: string;
}

/** 下单入参 */
export interface CreateOrderPayload {
  productId: string;
  /** 购买数量（局数/小时数），金额 = 单价 × 数量 */
  quantity: number;
  /** 订单支付方式 */
  provider: OrderPaymentMethod;
  /** 数字游戏 ID，1～32 位数字 */
  gameAccountId: string;
  /** 文本游戏 ID（选填） */
  gameTextId?: string;
  /** 本单游戏区服 */
  serviceRegion: BoosterServiceRegion;
  /** 自动安排或锁定指定打手 */
  boosterSelectionMode: OrderBoosterSelectionMode;
  /** 用户备注（选填） */
  remark?: string;
  /** 账号信息（选填，仅本人/接单打手/管理端可见） */
  accountInfo?: string;
  /** 抵扣用的我的优惠券 id（选填） */
  userCouponId?: string;
}

/** 下单结果（余额支付或抵扣到 0 元时 paid 为 true） */
export interface CreateOrderResult {
  orderId: string;
  orderNo: string;
  provider: OrderPaymentMethod;
  /** 二维码内容（渠道 Native 支付）；余额/JSAPI/0 元单为空串 */
  qrCode: string;
  /** 是否已支付完成 */
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

/** 订单视图（页面消费字段） */
export interface OrderView {
  id: string;
  orderNo: string;
  productId: string;
  /** 商品标题快照 */
  productTitle: string;
  /** 商品封面快照 */
  productCover: string;
  quantity: number;
  amountFen: number;
  amountYuan: string;
  /** 折前原价（分） */
  originalAmountFen: number;
  /** 下单时会员折扣快照（万分比） */
  discountBp: number;
  /** 优惠券抵扣金额快照（分） */
  couponDeductionFen: number;
  provider: OrderPaymentMethod;
  status: OrderStatus;
  remark: string;
  remarkMedia: RemarkMediaItem[];
  /** 账号信息 */
  accountInfo: string;
  /** 接单打手显示名快照；未接单为空串 */
  boosterName: string;
  /** 数字游戏 ID */
  gameAccountId: string;
  /** 文本游戏 ID */
  gameTextId: string;
  /** 本单游戏区服 */
  serviceRegion: BoosterServiceRegion | '';
  createdAt: string;
  paidAt: string;
  /** 订单群会话 id；支付成功自动建群后回填，空串表示未建群 */
  conversationId: string;
}

/** 下单/订单参数限制 */
export const ORDER_LIMITS = {
  remarkMax: 200,
  quantityMin: 1,
  quantityMax: 99,
  remarkMediaMax: 6,
  accountInfoMax: 200,
  gameAccountIdMax: 32,
  gameTextIdMax: 64,
} as const;

/** 我的订单分页查询结果 */
export type MyOrderPage = PaginatedResult<OrderView>;
