/**
 * 打手罚款（前后端共享契约）。
 * 订单未完成/服务有问题时，财务可对打手罚款：
 * 从钱包余额或已缴押金中扣除，留存罚款记录与理由供审计追溯。
 */

/** 罚款扣除来源 */
export enum PenaltySource {
  /** 从钱包余额扣除（记一条 penalty 出账流水） */
  Balance = 'balance',
  /** 从已缴押金中扣除（押金由平台代管，直接核减） */
  Deposit = 'deposit',
}

/** 罚款来源展示文案 */
export const PENALTY_SOURCE_TEXT: Record<PenaltySource, string> = {
  [PenaltySource.Balance]: '钱包余额',
  [PenaltySource.Deposit]: '押金',
};

/** 罚款字段约束（前后端共用同一校验规则） */
export const PENALTY_LIMITS = {
  /** 罚款理由最大长度 */
  reasonMax: 255,
  /** 关联订单号最大长度 */
  orderNoMax: 64,
} as const;

/** 创建罚款入参（财务） */
export interface CreatePenaltyBody {
  /** 被罚打手的用户 id */
  boosterUserId: string;
  /** 罚款金额（分，正整数） */
  amountFen: number;
  /** 扣除来源 */
  source: PenaltySource;
  /** 罚款理由（必填，审计追溯） */
  reason: string;
  /** 关联订单号（选填） */
  orderNo?: string;
}

/** 罚款记录视图 */
export interface PenaltyView {
  id: string;
  boosterUserId: string;
  /** 被罚打手用户名 */
  username: string;
  /** 被罚打手昵称 */
  nickname: string;
  /** 关联订单号（无则空串） */
  orderNo: string;
  amountFen: number;
  amountYuan: string;
  source: PenaltySource;
  reason: string;
  /** 操作人用户 id */
  createdBy: string;
  createdAt: string;
}
