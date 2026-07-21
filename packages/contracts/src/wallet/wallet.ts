/**
 * 钱包模块共享契约（前后端单一来源）。
 * 金额一律以「分」为单位的整数传输，避免浮点误差；
 * 展示用「元」字符串由 fenToYuan 统一换算，前端只读不参与计算。
 */

/** 充值（收款）渠道 */
export enum PaymentProvider {
  Alipay = 'alipay',
  Wechat = 'wechat',
}

/** 支付渠道展示文案 */
export const PAYMENT_PROVIDER_TEXT: Record<PaymentProvider, string> = {
  [PaymentProvider.Alipay]: '支付宝',
  [PaymentProvider.Wechat]: '微信',
};

/** 提现（付款）渠道；微信为预留位，调用即提示未开通 */
export enum PayoutProvider {
  Alipay = 'alipay',
  Wechat = 'wechat',
}

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
}

/** 发起充值结果（扫码支付：返回二维码内容，前端渲染成二维码供用户扫码） */
export interface CreateRechargeResult {
  orderId: string;
  outTradeNo: string;
  provider: PaymentProvider;
  /** 二维码内容（支付宝 qr_code / 微信 code_url） */
  qrCode: string;
  amountFen: number;
  amountYuan: string;
}

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
  /** 收款方账号（支付宝登录号：邮箱或手机号） */
  account: string;
  /** 收款方真实姓名 */
  accountName: string;
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
  /** 收款方支付宝账号 */
  account: string;
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
  /** 收款方支付宝账号 */
  account: string;
  /** 收款方真实姓名 */
  accountName: string;
  /** 渠道转账单号（成功后回填） */
  providerOrderId: string | null;
  /** 失败/驳回原因 */
  failReason: string | null;
  createdAt: string;
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
