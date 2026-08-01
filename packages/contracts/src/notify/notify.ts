/** 微信通知渠道：小程序订阅消息 / 公众号（订阅号·服务号）模板消息 */
export enum NotifyWechatChannel {
  /** 微信小程序（订阅消息） */
  Mini = 'mini',
  /** 微信公众号（模板消息） */
  Official = 'official',
}

export const NOTIFY_WECHAT_CHANNEL_VALUES: readonly NotifyWechatChannel[] = [
  NotifyWechatChannel.Mini,
  NotifyWechatChannel.Official,
];

/** 用户微信绑定视图（不下发 openid 明文，仅返回脱敏后缀供确认） */
export interface WechatBindingView {
  channel: NotifyWechatChannel;
  /** openid 脱敏展示（仅保留末四位） */
  openidMasked: string;
  /** 绑定时间（ISO 字符串） */
  boundAt: string;
}

/** 本人微信绑定概览 */
export interface MyWechatBindingsView {
  /** 平台是否已启用微信通知（凭证未配置时前端隐藏绑定入口） */
  enabled: boolean;
  bindings: WechatBindingView[];
}

/** 公众号网页授权地址响应 */
export interface WechatOfficialAuthorizeUrlView {
  url: string;
}

/** 订单通知的逻辑字段（模板字段映射配置的 key 取自这里） */
export interface OrderNotifyPayload {
  /** 通知标题（如「接单大厅有新订单」） */
  title: string;
  /** 订单号 */
  orderNo: string;
  /** 商品名称 */
  product: string;
  /** 金额文案（如「128.00元」） */
  amount: string;
  /** 时间文案（如「2026-08-01 12:30」） */
  time: string;
  /** 备注文案 */
  remark: string;
}

/** 订单通知逻辑字段名列表（配置中心字段映射 JSON 的合法 key） */
export const ORDER_NOTIFY_PAYLOAD_KEYS = [
  'title',
  'orderNo',
  'product',
  'amount',
  'time',
  'remark',
] as const satisfies readonly (keyof OrderNotifyPayload)[];

/** 语音播报文案（C 端 / 管理端共用，集中登记避免散落） */
export const NOTIFY_VOICE_TEXTS = {
  /** 打手：接单大厅出现新订单 */
  newHallOrder: '接单大厅有新的订单，请及时查看',
  /** 管理端：出现新的待处理订单 */
  newPendingOrder: '您有新的订单，请及时处理',
  /** 新聊天消息 */
  newChatMessage: '您有新的消息',
} as const;

/** 语音播报的最小间隔（毫秒），避免连续事件轰炸式播报 */
export const NOTIFY_VOICE_MIN_INTERVAL_MS = 8_000;

/** 通知相关限制值（集中登记，避免散落魔法数字） */
export const NOTIFY_LIMITS = {
  /** 单次订单事件的微信通知收件人上限（防止大租户群发拖垮请求） */
  wechatRecipientsMax: 200,
} as const;
