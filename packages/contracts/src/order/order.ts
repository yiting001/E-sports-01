import type { BoosterServiceRegion } from "../booster/booster";
import type { PaginationQuery } from "../common/pagination";

/**
 * 服务订单（前后端共享契约）。
 * 用户在商品详情页下单 → 支付宝/微信扫码或钱包余额支付 → 支付成功进入「待客服处理」，
 * 后续由客服指派打手或下发接单大厅（后续迭代实现）。
 */

/** 订单支付方式；与钱包充值渠道分离，避免余额被误用于充值。 */
export enum OrderPaymentMethod {
  Alipay = "alipay",
  Wechat = "wechat",
  /** 微信公众号 JSAPI 支付（微信内浏览器直接拉起收银台，不出二维码） */
  WechatJsapi = "wechat_jsapi",
  Balance = "balance",
}

/** 订单支付方式展示文案 */
export const ORDER_PAYMENT_METHOD_TEXT: Record<OrderPaymentMethod, string> = {
  [OrderPaymentMethod.Alipay]: "支付宝",
  [OrderPaymentMethod.Wechat]: "微信",
  [OrderPaymentMethod.WechatJsapi]: "微信",
  [OrderPaymentMethod.Balance]: "钱包余额",
};

/** 下单时的打手选择方式；specified 锁定指定打手，由客服确认进入服务。 */
export enum OrderBoosterSelectionMode {
  Auto = "auto",
  Specified = "specified",
}

/** 订单状态（全流程预留，本期实现到「待客服处理」） */
export enum OrderStatus {
  /** 待付款（已创建未支付） */
  PendingPayment = "pending_payment",
  /** 已支付，待客服处理（指派打手/下发大厅） */
  PendingService = "pending_service",
  /** 已下发接单大厅，待打手接单 */
  Dispatching = "dispatching",
  /** 服务中（打手已接单） */
  Serving = "serving",
  /** 已完成 */
  Completed = "completed",
  /** 用户已申请退款，履约冻结并等待后台审核/渠道处理 */
  RefundReviewing = "refund_reviewing",
  /** 原支付方式已完成全额退款 */
  Refunded = "refunded",
  /** 已取消（仅待付款可取消） */
  Cancelled = "cancelled",
}

/** 订单状态展示文案 */
export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: "待付款",
  [OrderStatus.PendingService]: "待客服处理",
  [OrderStatus.Dispatching]: "待接单",
  [OrderStatus.Serving]: "服务中",
  [OrderStatus.Completed]: "已完成",
  [OrderStatus.RefundReviewing]: "退款处理中",
  [OrderStatus.Refunded]: "已退款",
  [OrderStatus.Cancelled]: "已取消",
};

/** 退款申请状态；与订单履约状态分离，避免把渠道结果误当作审核结果。 */
export enum OrderRefundStatus {
  PendingReview = "pending_review",
  Processing = "processing",
  Succeeded = "succeeded",
  Rejected = "rejected",
  Failed = "failed",
}

/** 退款申请状态展示文案 */
export const ORDER_REFUND_STATUS_TEXT: Record<OrderRefundStatus, string> = {
  [OrderRefundStatus.PendingReview]: "待审核",
  [OrderRefundStatus.Processing]: "退款处理中",
  [OrderRefundStatus.Succeeded]: "退款成功",
  [OrderRefundStatus.Rejected]: "审核驳回",
  [OrderRefundStatus.Failed]: "退款失败",
};

/** 退款原因和审核说明的共享输入约束。 */
export const ORDER_REFUND_LIMITS = {
  reasonMax: 500,
  reviewReasonMax: 500,
} as const;

export interface RequestOrderRefundPayload {
  reason: string;
}

export interface RejectOrderRefundPayload {
  reason: string;
}

/** 订单字段约束（DTO 校验与前端输入限制共享） */
export const ORDER_LIMITS = {
  remarkMax: 200,
  quantityMin: 1,
  quantityMax: 99,
  /** 备注附件（图片/视频）最大数量 */
  remarkMediaMax: 6,
  accountInfoMax: 200,
  gameAccountIdMax: 32,
  gameTextIdMax: 64,
} as const;

/** 接单大厅筛选；列表只返回待接单安全投影。 */
export interface HallOrderFilter {
  /** 按订单号或商品名匹配。 */
  keyword?: string;
  /** 按手机端/电脑端区服筛选。 */
  serviceRegion?: BoosterServiceRegion;
}

/** 接单大厅完整分页查询契约。 */
export interface HallOrderQuery extends PaginationQuery, HallOrderFilter {}

/** 备注附件类型 */
export type RemarkMediaType = "image" | "video";

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
  /** specified 时必填，值为 BoosterPublicView.userId */
  requestedBoosterId?: string;
  /** 用户备注（大区/段位/开黑时间等，选填） */
  remark?: string;
  /** 备注附件（图片/视频，选填） */
  remarkMedia?: RemarkMediaItem[];
  /** 账号信息（选填；仅本人、接单打手与管理端可见，接单大厅不展示） */
  accountInfo?: string;
  /** 抵扣用的我的优惠券 id（选填，不用券不传） */
  userCouponId?: string;
}

/** 微信公众号 JSAPI 拉起支付所需参数（WeixinJSBridge.getBrandWCPayRequest 入参） */
export interface WechatJsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  /** 形如 prepay_id=xxx */
  package: string;
  signType: "RSA";
  paySign: string;
}

/** 创建订单结果（扫码支付：二维码内容；JSAPI 支付：拉起参数；0 元单直接支付成功无需扫码） */
export interface CreateOrderResult {
  orderId: string;
  orderNo: string;
  provider: OrderPaymentMethod;
  /** 二维码内容（支付宝 qr_code / 微信 code_url）；JSAPI/余额支付或 0 元单为空串 */
  qrCode: string;
  /** 微信公众号 JSAPI 拉起支付参数；非 JSAPI 支付为 null */
  jsapiParams: WechatJsapiPayParams | null;
  /** 是否已支付完成（余额支付或优惠抵扣到 0 元时为 true） */
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

/** C 端的一笔全额退款申请投影，不包含后台审核与渠道幂等标识。 */
export interface OrderRefundView {
  status: OrderRefundStatus;
  amountFen: number;
  amountYuan: string;
  paymentMethod: OrderPaymentMethod;
  reason: string;
  rejectReason: string;
  failReason: string;
  requestedAt: string;
  reviewedAt: string;
  refundedAt: string;
}

/** 管理端退款投影：补充审核追踪和渠道幂等所需的内部标识。 */
export interface AdminOrderRefundView extends OrderRefundView {
  id: string;
  refundNo: string;
  reviewerId: string;
}

/** 管理端订单视图：在 C 端视图之上补充归属用户/客服快照/渠道交易号 */
export interface AdminOrderView extends OrderView {
  refund: AdminOrderRefundView | null;
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
  /** 商品封面副标语（接单大厅下发，取商品当前 coverSub；其余视图为空串） */
  productCoverSub: string;
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
  provider: OrderPaymentMethod;
  status: OrderStatus;
  /** 当前订单是否满足服务端退款申请规则；前端不得自行推断。 */
  canRequestRefund: boolean;
  /** 退款申请；尚未申请时为 null。 */
  refund: OrderRefundView | null;
  remark: string;
  /** 备注附件（图片/视频） */
  remarkMedia: RemarkMediaItem[];
  /** 账号信息（接单大厅视图中为空串，打手接单后可见） */
  accountInfo: string;
  /** 接单打手 id（接单/被指派后回填；未接单为空串） */
  boosterId: string;
  /** 接单打手显示名快照（接单/被指派时固化；未接单为空串） */
  boosterName: string;
  /** 数字游戏 ID；接单大厅视图中为空串 */
  gameAccountId: string;
  /** 文本游戏 ID；接单大厅视图中为空串 */
  gameTextId: string;
  /** 本单游戏区服 */
  serviceRegion: BoosterServiceRegion | "";
  /** 下单时选择的打手安排方式 */
  boosterSelectionMode: OrderBoosterSelectionMode;
  /** 锁定的指定打手 userId；自动安排为空串 */
  requestedBoosterId: string;
  /** 锁定的指定打手显示名快照；自动安排为空串 */
  requestedBoosterName: string;
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
