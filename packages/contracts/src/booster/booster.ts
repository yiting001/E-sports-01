/**
 * 打手入驻（前后端共享契约）。
 * 用户在个人中心提交入驻申请（游戏昵称 + 擅长游戏 + 段位 + 自我介绍），
 * 管理员审核通过后授予 booster 角色成为打手；驳回可重新提交；
 * 管理端可对打手资料进行编辑维护。
 */

/** 打手角色码：审核通过后授予该角色，标识用户为打手 */
export const BOOSTER_ROLE_CODE = 'booster';

/** 打手申请字段长度限制（前后端共用同一校验规则） */
export const BOOSTER_LIMITS = {
  /** 游戏昵称最大长度 */
  gameNicknameMax: 32,
  /** 擅长游戏最大长度 */
  gameNameMax: 64,
  /** 段位/实力描述最大长度 */
  rankMax: 64,
  /** 自我介绍最大长度 */
  introMax: 500,
} as const;

/** 打手入驻申请状态 */
export enum BoosterStatus {
  /** 尚未提交 */
  None = 'none',
  /** 已提交，待审核 */
  Pending = 'pending',
  /** 审核通过（已授予打手角色） */
  Approved = 'approved',
  /** 审核驳回，可重新提交 */
  Rejected = 'rejected',
}

/** 提交打手入驻申请入参 */
export interface SubmitBoosterPayload {
  /** 游戏昵称 */
  gameNickname: string;
  /** 擅长游戏 */
  gameName: string;
  /** 段位/实力描述 */
  rank: string;
  /** 自我介绍（接单经验、可服务时间等） */
  intro: string;
}

/** 管理端编辑打手资料入参（各字段可选，仅更新传入项） */
export interface UpdateBoosterPayload {
  gameNickname?: string;
  gameName?: string;
  rank?: string;
  intro?: string;
}

/** 审核打手入驻申请入参 */
export interface ReviewBoosterPayload {
  /** 是否通过（通过即授予 booster 角色） */
  approve: boolean;
  /** 驳回理由（approve=false 时必填） */
  rejectReason?: string;
}

/** 打手申请视图（管理端列表/用户本人查看共用） */
export interface BoosterView {
  /** 累计完成订单数（等级依据） */
  completedOrders: number;
  /** 当前等级序号 */
  level: number;
  /** 当前等级名称 */
  levelName: string;
  /** 当前等级提成比例（万分比） */
  commissionRateBp: number;
  /** 已缴押金（分） */
  depositFen: number;
  id: string;
  userId: string;
  /** 用户名（管理端展示） */
  username: string;
  /** 昵称（管理端展示） */
  nickname: string;
  gameNickname: string;
  gameName: string;
  rank: string;
  intro: string;
  status: BoosterStatus;
  rejectReason: string;
  /** 审核人用户名；未审核为空串 */
  reviewedBy: string;
  /** 审核时间 ISO 串；未审核为空串 */
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** 押金交付策略（管理端可配：最低交付额为接单门槛，最高交付额为缴纳上限） */
export interface BoosterDepositPolicy {
  /** 最低交付额（分）；0 表示不要求押金 */
  minFen: number;
  /** 最高交付额（分），不得低于最低交付额 */
  maxFen: number;
}

/** 打手缴纳押金入参（区间内自选金额） */
export interface PayDepositPayload {
  /** 本次缴纳金额（分），缴后累计不得超过最高交付额 */
  amountFen: number;
}

/** 当前用户打手入驻概览 */
export interface BoosterMineView {
  /** 聚合状态：无记录为 none，否则取记录状态 */
  status: BoosterStatus;
  /** 已提交时返回申请记录，未提交为 null */
  record: BoosterView | null;
  /** 提交入驻申请是否要求已通过实名认证（配置开关） */
  requireRealname: boolean;
  /** 当前用户实名认证是否已通过 */
  realnameApproved: boolean;
  /** 押金交付策略（最低/最高交付额，配置中心设定） */
  depositPolicy: BoosterDepositPolicy;
}
