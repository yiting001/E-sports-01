/**
 * 钱包模块共享契约（前后端单一来源）。
 * 金额一律以「分」为单位的整数传输，避免浮点误差；
 * 展示用「元」字符串由 fenToYuan 统一换算，前端只读不参与计算。
 */
import type { WechatJsapiPayParams } from "../order/order";

/** 充值（收款）渠道 */
export enum PaymentProvider {
  Alipay = 'alipay',
  Wechat = 'wechat',
  /** 微信公众号 JSAPI（微信内浏览器拉起收银台，与 Native 扫码共用商户凭证） */
  WechatJsapi = 'wechat_jsapi',
  /** 计全付微信扫码（WX_NATIVE，开启计全网关后替代官方微信扫码） */
  JqfWechat = 'jqf_wechat',
  /** 计全付微信公众号（WX_JSAPI，开启计全网关后替代官方 JSAPI） */
  JqfWechatJsapi = 'jqf_wechat_jsapi',
  /** 计全付支付宝扫码（ALI_QR，开启计全网关后替代官方支付宝扫码） */
  JqfAlipay = 'jqf_alipay',
}

/** 支付渠道展示文案 */
export const PAYMENT_PROVIDER_TEXT: Record<PaymentProvider, string> = {
  [PaymentProvider.Alipay]: '支付宝',
  [PaymentProvider.Wechat]: '微信',
  [PaymentProvider.WechatJsapi]: '微信公众号',
  [PaymentProvider.JqfWechat]: '计全微信',
  [PaymentProvider.JqfWechatJsapi]: '计全微信公众号',
  [PaymentProvider.JqfAlipay]: '计全支付宝',
};

/** 用户可选的充值支付方式（计全付渠道由服务端按网关开关映射，不由前端直接指定） */
export const RECHARGE_PAYMENT_PROVIDERS = [
  PaymentProvider.Alipay,
  PaymentProvider.Wechat,
  PaymentProvider.WechatJsapi,
] as const;

/** 支付网关：同一支付方式可在官方直连与计全付聚合之间切换 */
export enum PaymentGateway {
  /** 官方直连（微信商户/支付宝开放平台） */
  Official = 'official',
  /** 计全付聚合支付 */
  Jqf = 'jqf',
}

/** 支付网关展示文案 */
export const PAYMENT_GATEWAY_TEXT: Record<PaymentGateway, string> = {
  [PaymentGateway.Official]: '官方渠道',
  [PaymentGateway.Jqf]: '计全付',
};

/**
 * 提现（付款）渠道。用户只选择「支付宝 / 微信零钱 / 银行卡」，
 * 服务端按提现网关开关映射为实际执行渠道（官方直连或计全付转账）并持久化到提现单。
 */
export enum PayoutProvider {
  /** 支付宝官方转账（alipay.fund.trans.uni.transfer） */
  Alipay = 'alipay',
  /** 微信官方商家转账（预留位，调用即提示未开通） */
  Wechat = 'wechat',
  /** 银行卡（用户选择位；仅计全付网关可用，服务端映射为 JqfBankCard） */
  BankCard = 'bank_card',
  /** 计全付转账 → 支付宝账户（ifCode=alipay，entryType=ALIPAY_CASH） */
  JqfAlipay = 'jqf_alipay',
  /** 计全付转账 → 微信零钱（ifCode=wxpay，entryType=WX_CASH，收款标识为服务端绑定的 openid） */
  JqfWechat = 'jqf_wechat',
  /** 计全付转账 → 对私银行卡（ifCode 按配置 aliaqfpay / yeepay，entryType=BANK_CARD，accountNo 为银行卡号） */
  JqfBankCard = 'jqf_bank_card',
}

/** 提现渠道展示文案 */
export const PAYOUT_PROVIDER_TEXT: Record<PayoutProvider, string> = {
  [PayoutProvider.Alipay]: '支付宝',
  [PayoutProvider.Wechat]: '微信零钱',
  [PayoutProvider.BankCard]: '银行卡',
  [PayoutProvider.JqfAlipay]: '支付宝（计全付）',
  [PayoutProvider.JqfWechat]: '微信零钱（计全付）',
  [PayoutProvider.JqfBankCard]: '银行卡（计全付）',
};

/**
 * 各提现网关下用户可选的提现方式（服务端据此校验并映射为实际执行渠道）：
 * 官方直连仅支付宝转账；计全付网关统一转账到银行卡。
 */
export const WITHDRAW_METHODS_BY_GATEWAY: Record<PaymentGateway, readonly PayoutProvider[]> = {
  [PaymentGateway.Official]: [PayoutProvider.Alipay],
  [PaymentGateway.Jqf]: [PayoutProvider.BankCard],
};

/** 计全付银行卡转账走的支付接口代码（ifCode） */
export enum JqfTransferIfCode {
  /** 支付宝安全发 */
  AliAqfPay = 'aliaqfpay',
  /** 易宝支付（对私银行卡需在 channelExtra 附身份证号与手机号） */
  YeePay = 'yeepay',
}

/** 计全付银行卡转账接口代码展示文案 */
export const JQF_TRANSFER_IF_CODE_TEXT: Record<JqfTransferIfCode, string> = {
  [JqfTransferIfCode.AliAqfPay]: '支付宝安全发（aliaqfpay）',
  [JqfTransferIfCode.YeePay]: '易宝支付（yeepay）',
};

/** 银行卡号格式：10～30 位数字 */
export const BANK_CARD_NO_PATTERN = /^\d{10,30}$/;

/** 大陆手机号格式 */
export const PAYOUT_PHONE_PATTERN = /^1\d{10}$/;

/** 提现渠道侧转账状态（渠道无关的归一值，由各驱动从渠道原始状态映射） */
export enum PayoutChannelState {
  /** 渠道已受理、尚未开始转账 */
  Created = 'created',
  /** 转账中 */
  Processing = 'processing',
  /** 转账成功 */
  Success = 'success',
  /** 转账失败 */
  Failed = 'failed',
  /** 转账关闭（渠道关单，资金未出） */
  Closed = 'closed',
}

/** 渠道转账状态展示文案 */
export const PAYOUT_CHANNEL_STATE_TEXT: Record<PayoutChannelState, string> = {
  [PayoutChannelState.Created]: '渠道已受理',
  [PayoutChannelState.Processing]: '渠道转账中',
  [PayoutChannelState.Success]: '渠道转账成功',
  [PayoutChannelState.Failed]: '渠道转账失败',
  [PayoutChannelState.Closed]: '渠道已关单',
};

/** 钱包状态 */
export enum WalletStatus {
  /** 正常，可收支 */
  Active = 'active',
  /** 冻结，禁止支出 */
  Frozen = 'frozen',
}

/** 流水类型 */
export enum WalletTxnType {
  Recharge = 'recharge',
  Withdraw = 'withdraw',
  /** 服务订单余额支付出账 */
  OrderPayment = 'order_payment',
  /** 服务订单退款入账 */
  OrderRefund = 'order_refund',
  /** 平台调整（人工增减），预留 */
  Adjust = 'adjust',
  /** 订单提成入账（打手完成订单按等级费率计提） */
  Commission = 'commission',
  /** 打手押金缴纳（从余额扣除，由平台代管） */
  Deposit = 'deposit',
  /** 打手押金退还（平台退回余额） */
  DepositRefund = 'deposit_refund',
  /** 罚款扣除（财务对打手罚款） */
  Penalty = 'penalty',
  /** 邀请奖励入账（邀请好友绑定成功发放） */
  InviteReward = 'invite_reward',
}

/** 流水类型展示文案（前端明细列表共用单一来源） */
export const WALLET_TXN_TYPE_TEXT: Record<WalletTxnType, string> = {
  [WalletTxnType.Recharge]: '充值',
  [WalletTxnType.Withdraw]: '提现',
  [WalletTxnType.OrderPayment]: '订单支付',
  [WalletTxnType.OrderRefund]: '订单退款',
  [WalletTxnType.Adjust]: '平台调整',
  [WalletTxnType.Commission]: '订单提成',
  [WalletTxnType.Deposit]: '押金缴纳',
  [WalletTxnType.DepositRefund]: '押金退还',
  [WalletTxnType.Penalty]: '罚款',
  [WalletTxnType.InviteReward]: '邀请奖励',
};

/** 钱包流水持久化字段限制 */
export const WALLET_TRANSACTION_LIMITS = {
  remarkMax: 255,
} as const;

/** 资金方向 */
export enum FundDirection {
  /** 入账（余额增加） */
  In = 'in',
  /** 出账（余额减少） */
  Out = 'out',
}

/** 充值订单状态 */
export enum RechargeStatus {
  /** 待支付 */
  Pending = 'pending',
  /** 已支付并入账 */
  Paid = 'paid',
  /** 已关闭/取消 */
  Closed = 'closed',
}

/** 提现订单状态（审核制：申请冻结 → 人工审核 → 渠道转账） */
export enum WithdrawalStatus {
  /** 待审核（已冻结扣减，等待财务审核） */
  Pending = 'pending',
  /** 处理中（审核通过，转账进行中） */
  Processing = 'processing',
  /** 成功 */
  Success = 'success',
  /** 失败（转账失败，余额已回滚） */
  Failed = 'failed',
  /** 已驳回（审核不通过，余额已回滚） */
  Rejected = 'rejected',
}

/** 提现状态展示文案 */
export const WITHDRAWAL_STATUS_TEXT: Record<WithdrawalStatus, string> = {
  [WithdrawalStatus.Pending]: '待审核',
  [WithdrawalStatus.Processing]: '处理中',
  [WithdrawalStatus.Success]: '已到账',
  [WithdrawalStatus.Failed]: '转账失败',
  [WithdrawalStatus.Rejected]: '已驳回',
};

/** 钱包视图 */
export interface WalletView {
  id: string;
  balanceFen: number;
  balanceYuan: string;
  status: WalletStatus;
  /** 当前提现手续费率（万分比），供前端在提现前实时展示手续费与到账金额 */
  withdrawFeeRateBp: number;
  /** 阶梯税费配置（按提现金额选档；空数组时回退到 withdrawFeeRateBp 单一费率） */
  withdrawTaxTiers: WithdrawTaxTier[];
  /** 当前提现网关下用户可选的提现方式（官方：支付宝；计全付：银行卡） */
  withdrawMethods: PayoutProvider[];
  /** 银行卡提现是否需要填写预留手机号（计全付接口为易宝时必填） */
  withdrawPhoneRequired: boolean;
}

/** 钱包统计视图 */
export interface WalletStatsView {
  balanceFen: number;
  balanceYuan: string;
  totalRechargeFen: number;
  totalRechargeYuan: string;
  totalWithdrawFen: number;
  totalWithdrawYuan: string;
  /** 充值成功笔数 */
  rechargeCount: number;
  /** 提现成功笔数 */
  withdrawCount: number;
}

/** 钱包流水（明细）视图 */
export interface WalletTransactionView {
  id: string;
  type: WalletTxnType;
  direction: FundDirection;
  amountFen: number;
  amountYuan: string;
  /** 变更后余额 */
  balanceAfterFen: number;
  balanceAfterYuan: string;
  /** 关联业务单号（充值/提现/服务订单 id） */
  bizOrderId: string | null;
  remark: string;
  createdAt: string;
}

/**
 * 钱包管理端列表项视图（按用户聚合）。
 * 展示用户及其钱包余额与累计收支；未开通钱包的用户以零值展示（initialized=false）。
 */
export interface WalletAdminView {
  userId: string;
  username: string;
  nickname: string;
  /** 是否已开通钱包；false 表示用户尚未初始化，余额按 0 展示 */
  initialized: boolean;
  balanceFen: number;
  balanceYuan: string;
  totalRechargeFen: number;
  totalRechargeYuan: string;
  totalWithdrawFen: number;
  totalWithdrawYuan: string;
  status: WalletStatus;
}

/** 钱包人工调整入参（管理端：增加/扣减余额并记一条 adjust 流水） */
export interface AdjustWalletBody {
  /** 调整方向：入账=增加余额，出账=扣减余额 */
  direction: FundDirection;
  /** 调整金额（分，正整数） */
  amountFen: number;
  /** 调整备注（必填，便于审计追溯） */
  remark: string;
}

/** 发起充值入参 */
export interface CreateRechargeBody {
  /** 充值金额（分） */
  amountFen: number;
  provider: PaymentProvider;
  /** 支付完成后同步跳回的前端地址（选填，仅支持同步跳转的聚合网关使用） */
  returnUrl?: string;
}

/** 发起充值结果（扫码支付：返回二维码内容；JSAPI：返回拉起支付参数） */
export interface CreateRechargeResult {
  orderId: string;
  outTradeNo: string;
  provider: PaymentProvider;
  /** 二维码内容（支付宝 qr_code / 微信 code_url）；JSAPI 支付为空串 */
  qrCode: string;
  /** 微信公众号 JSAPI 拉起支付参数；非 JSAPI 支付为 null */
  jsapiParams: WechatJsapiPayParams | null;
  amountFen: number;
  amountYuan: string;
}

/**
 * 支付同步跳转地址（returnUrl）长度上限：计全付 returnUrl 字段为 String(128)，
 * 该上限包含服务端替换占位符或追加 payRef 后的完整地址。
 */
export const PAY_RETURN_URL_MAX_LENGTH = 128;

/**
 * returnUrl 中的业务单据占位符：前端传 `…#/orders/{payRef}` 这类地址，
 * 服务端下单时用订单 id / 充值单号替换，使支付完成后直接跳回原业务页（订单详情、钱包等）。
 */
export const PAY_RETURN_REF_PLACEHOLDER = "{payRef}";

/**
 * 支付回跳 querystring 键：地址中没有占位符时服务端把 payRef 追加为 query（充值单号 outTradeNo），
 * returnPageAction 由计全付追加。
 */
export const PAY_RETURN_QUERY_KEYS = {
  ref: "payRef",
  action: "returnPageAction",
} as const;

/** 充值支付结果查询视图（前端轮询查单用） */
export interface RechargeStatusView {
  outTradeNo: string;
  status: RechargeStatus;
}

/** 发起提现入参 */
export interface CreateWithdrawalBody {
  /** 提现金额（分） */
  amountFen: number;
  provider: PayoutProvider;
  /**
   * 收款方账号：支付宝为登录号（邮箱或手机号）；银行卡为卡号；
   * 微信零钱不需要填写，服务端取当前账号绑定的公众号 openid 作为收款标识。
   */
  account?: string;
  /** 收款方真实姓名 */
  accountName: string;
  /** 收款方身份证号（报税用，18 位；银行卡提现同时作为渠道实名要素） */
  idCardNo: string;
  /** 开户行名称（银行卡提现必填，如「中国工商银行」） */
  bankName?: string;
  /** 银行预留手机号（银行卡提现且渠道要求时必填） */
  phone?: string;
}

/** 提现结果视图 */
export interface WithdrawalResultView {
  orderId: string;
  status: WithdrawalStatus;
  /** 手续费（分） */
  feeFen: number;
  /** 预计到账金额（分）= 提现金额 - 手续费 */
  arriveFen: number;
  failReason: string | null;
}

/** C 端我的提现记录列表项（金额/手续费/到账/状态/失败原因） */
export interface WithdrawalView {
  id: string;
  amountFen: number;
  amountYuan: string;
  feeFen: number;
  feeYuan: string;
  /** 实际到账金额（分）= 提现金额 - 手续费 */
  arriveFen: number;
  arriveYuan: string;
  provider: PayoutProvider;
  status: WithdrawalStatus;
  /** 收款方账号（支付宝登录号；微信零钱为脱敏后的 openid；银行卡为脱敏后的卡号） */
  account: string;
  /** 开户行名称（银行卡提现回填，其余为 null） */
  bankName: string | null;
  /** 失败/驳回原因 */
  failReason: string | null;
  createdAt: string;
}

/** 提现管理端列表项视图（财务审核用） */
export interface WithdrawalAdminView {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  amountFen: number;
  amountYuan: string;
  feeFen: number;
  feeYuan: string;
  /** 实际到账金额（分）= 提现金额 - 手续费 */
  arriveFen: number;
  arriveYuan: string;
  provider: PayoutProvider;
  status: WithdrawalStatus;
  /** 收款方账号（支付宝登录号 / 微信 openid / 银行卡号） */
  account: string;
  /** 收款方真实姓名 */
  accountName: string;
  /** 收款方身份证号（报税用；历史单据可能为空） */
  idCardNo: string | null;
  /** 开户行名称（银行卡提现） */
  bankName: string | null;
  /** 银行预留手机号（银行卡提现且渠道要求时填写） */
  phone: string | null;
  /** 渠道转账单号（计全付 transferId / 支付宝 order_id，发起转账后回填） */
  providerOrderId: string | null;
  /** 最终资金渠道（微信/支付宝）的转账单号（聚合网关通知/查单回填） */
  channelOrderNo: string | null;
  /** 渠道侧转账状态（官方直连或尚未发起时为 null） */
  channelState: PayoutChannelState | null;
  /** 渠道错误描述（渠道失败时回填） */
  channelErrMsg: string | null;
  /** 渠道向平台收取的手续费（分，含技术服务费；由渠道通知/查单回填，官方直连或未回填为 0） */
  channelFeeFen: number;
  channelFeeYuan: string;
  /** 渠道状态最近一次同步时间（通知或主动查单） */
  channelSyncedAt: string | null;
  /** 失败/驳回原因 */
  failReason: string | null;
  createdAt: string;
}

/** 报税表单导出结果（财务后台一键导出，前端生成文件下载） */
export interface WithdrawalTaxExportView {
  /** 建议文件名（含导出日期） */
  filename: string;
  /** CSV 正文（UTF-8，前端自行加 BOM 保证 Excel 中文不乱码） */
  csv: string;
  /** 导出记录数 */
  count: number;
}

/** 提现驳回入参（管理端） */
export interface RejectWithdrawalBody {
  /** 驳回原因（回填到订单并展示给用户） */
  reason: string;
}

/** 1 元 = 100 分 */
export const FEN_PER_YUAN = 100;

/**
 * 分 → 元 展示字符串（保留两位小数）。
 * 单一来源，前后端共用，避免各处重复实现导致的精度/格式漂移。
 */
export function fenToYuan(fen: number): string {
  const sign = fen < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(fen));
  const yuan = Math.floor(abs / FEN_PER_YUAN);
  const cents = abs % FEN_PER_YUAN;
  return `${sign}${yuan}.${cents.toString().padStart(2, '0')}`;
}

/**
 * 元字符串 → 分整数（用于解析渠道回调中的金额，如支付宝 total_amount="10.00"）。
 * 先四舍五入到分，规避浮点误差。
 */
export function yuanToFen(yuan: string): number {
  return Math.round(Number(yuan) * FEN_PER_YUAN);
}

/** 费率基数：手续费率以万分比存储（如 100 = 1%），整数运算规避浮点误差 */
export const FEE_RATE_BASE = 10000;

/**
 * 按万分比费率计算提现手续费（分），向上取整保证平台不亏损分位；
 * 费率为 0 时手续费为 0。
 */
export function calcWithdrawFeeFen(amountFen: number, rateBp: number): number {
  if (rateBp <= 0) {
    return 0;
  }
  return Math.ceil((amountFen * rateBp) / FEE_RATE_BASE);
}

/** 阶梯税费档位：提现金额 ≥ minFen 时适用 rateBp（万分比）费率 */
export interface WithdrawTaxTier {
  /** 档位起始金额（分，含），0 表示从任意金额起 */
  minFen: number;
  /** 该档税费率（万分比，如 100 = 1%） */
  rateBp: number;
}

/** 阶梯税费档位数量上限（管理端可视化配置约束） */
export const WITHDRAW_TAX_TIERS_MAX = 20;

/** 税务配置视图（管理端「税务管理」页展示） */
export interface WithdrawTaxConfigView {
  /** 阶梯税费档位（按 minFen 升序） */
  tiers: WithdrawTaxTier[];
  /** 回退单一费率（万分比，无档位命中时生效） */
  fallbackRateBp: number;
}

/** 保存税务配置入参（管理端） */
export interface SaveWithdrawTaxConfigBody {
  tiers: WithdrawTaxTier[];
}

/** 身份证号格式（18 位，末位可为 X） */
export const ID_CARD_NO_PATTERN = /^\d{17}[\dXx]$/;

/**
 * 校验并规整阶梯税费配置（配置中心 JSON 值，前后端共用）：
 * 只保留合法档位（整数、minFen ≥ 0、0 ≤ rateBp ≤ 万分之万），按 minFen 升序去重；
 * 非数组或全部非法时返回空数组（回退单一费率）。
 */
export function sanitizeWithdrawTaxTiers(value: unknown): WithdrawTaxTier[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const tiers = value.filter((item): item is WithdrawTaxTier => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    const tier = item as Partial<WithdrawTaxTier>;
    return (
      Number.isInteger(tier.minFen) &&
      (tier.minFen as number) >= 0 &&
      Number.isInteger(tier.rateBp) &&
      (tier.rateBp as number) >= 0 &&
      (tier.rateBp as number) <= FEE_RATE_BASE
    );
  });
  const byMin = new Map(tiers.map((t) => [t.minFen, t.rateBp]));
  return [...byMin.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minFen, rateBp]) => ({ minFen, rateBp }));
}

/**
 * 按提现金额选取阶梯税费率（万分比）：
 * 取「minFen ≤ 提现金额」的最高档；无档位命中或未配置阶梯时回退 fallbackRateBp。
 */
export function pickWithdrawFeeRateBp(
  amountFen: number,
  tiers: WithdrawTaxTier[],
  fallbackRateBp: number,
): number {
  let matched: WithdrawTaxTier | null = null;
  for (const tier of tiers) {
    if (tier.minFen <= amountFen) {
      matched = tier;
    }
  }
  return matched ? matched.rateBp : fallbackRateBp;
}

/** 钱包默认参数（配置中心未设置时回退；杜绝散落的硬编码阈值） */
export const WALLET_DEFAULTS = {
  /** 最小充值金额（分） */
  minRechargeFen: 100,
  /** 最小提现金额（分） */
  minWithdrawFen: 100,
  /** 提现手续费率（万分比，0 表示免手续费） */
  withdrawFeeRateBp: 0,
  /** 默认充值渠道 */
  paymentProvider: PaymentProvider.Alipay,
  /** 默认提现渠道 */
  payoutProvider: PayoutProvider.Alipay,
} as const;
