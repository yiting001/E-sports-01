/** 打手入驻（前后端共享契约） */

/** 打手角色码：审核通过后授予该角色，标识用户为打手 */
export const BOOSTER_ROLE_CODE = "booster";

/** 打手申请字段长度限制（前后端共用同一校验规则） */
export const BOOSTER_LIMITS = {
  applicantNameMax: 64,
  introMin: 3,
  introMax: 500,
  contactValueMax: 128,
  materialImageMax: 2048,
  voiceUrlMax: 2048,
  invitationCodeMax: 64,
  serviceRegionsMax: 2,
  directoryKeywordMax: 64,
} as const;

/** 打手语音样本上传约束（5 MB，格式由服务端 MIME + 文件头双重校验） */
export const BOOSTER_VOICE_LIMITS = {
  maxSizeBytes: 5 * 1024 * 1024,
  mimeTypes: [
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
  ],
} as const;

/** 旧申请字段长度，仅用于保留历史列和 migration 回滚兼容 */
export const BOOSTER_LEGACY_LIMITS = {
  gameNicknameMax: 32,
  gameNameMax: 64,
  rankMax: 64,
} as const;

/** 性别选项 */
export enum BoosterGender {
  Male = "male",
  Female = "female",
}

/** 联系方式类型 */
export enum BoosterContactType {
  Phone = "phone",
  Wechat = "wechat",
  QQ = "qq",
}

/** 接单区服语义值，供校验、计价和展示配置复用。 */
export const BOOSTER_SERVICE_REGION = {
  Mobile: "delta-mobile",
  Pc: "delta-pc",
} as const;

export type BoosterServiceRegion =
  (typeof BOOSTER_SERVICE_REGION)[keyof typeof BOOSTER_SERVICE_REGION];

/** 当前开放的接单区服，标签和值由前后端共享，避免展示与校验漂移 */
export const BOOSTER_SERVICE_REGIONS = [
  { value: BOOSTER_SERVICE_REGION.Mobile, label: "三角洲 - 手机端" },
  { value: BOOSTER_SERVICE_REGION.Pc, label: "三角洲 - 电脑端" },
] as const;

export const BOOSTER_SERVICE_REGION_VALUES: readonly BoosterServiceRegion[] =
  BOOSTER_SERVICE_REGIONS.map((item) => item.value);

/** 对外打手显示名：优先昵称，缺失时使用不含登录用户名的稳定 ID 后缀。 */
export function formatBoosterDisplayName(
  userId: string,
  nickname: string
): string {
  const normalizedNickname = nickname.trim();
  if (normalizedNickname) {
    return normalizedNickname;
  }
  const suffix = userId.replace(/-/g, "").slice(-6).toUpperCase();
  return `打手${suffix}`;
}

/** 打手入驻申请状态 */
export enum BoosterStatus {
  /** 尚未提交 */
  None = "none",
  /** 已提交，待审核 */
  Pending = "pending",
  /** 审核通过（已授予打手角色） */
  Approved = "approved",
  /** 审核驳回，可重新提交 */
  Rejected = "rejected",
}

/** 提交打手入驻申请入参 */
export interface SubmitBoosterPayload {
  /** 申请人姓名 */
  applicantName: string;
  gender: BoosterGender;
  /** 至少选择一个接单区服 */
  serviceRegions: BoosterServiceRegion[];
  intro: string;
  contactType: BoosterContactType;
  /** 与联系方式类型对应的手机号、微信号或 QQ 号 */
  contactValue: string;
  /** 其他材料图片 URL；未上传为空串 */
  materialImage: string;
  /** 入驻邀请码，仅供审核追溯，不触发邀请奖励 */
  invitationCode: string;
}

/** 管理端编辑打手资料入参（各字段可选，仅更新传入项） */
export interface UpdateBoosterPayload {
  applicantName?: string;
  gender?: BoosterGender;
  serviceRegions?: BoosterServiceRegion[];
  intro?: string;
  contactType?: BoosterContactType;
  contactValue?: string;
  materialImage?: string;
  invitationCode?: string;
}

/** 审核通过的打手自主切换接单状态。 */
export interface UpdateBoosterAvailabilityPayload {
  acceptingOrders: boolean;
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
  /** 打手自主维护的接单状态；false 时不能被选择、指派或接单 */
  acceptingOrders: boolean;
  id: string;
  userId: string;
  /** 用户名（管理端展示） */
  username: string;
  /** 昵称（管理端展示） */
  nickname: string;
  applicantName: string;
  gender: BoosterGender | "";
  serviceRegions: BoosterServiceRegion[];
  intro: string;
  contactType: BoosterContactType | "";
  contactValue: string;
  materialImage: string;
  /** 对外试听语音 URL；未上传为空串 */
  voiceUrl: string;
  invitationCode: string;
  status: BoosterStatus;
  rejectReason: string;
  /** 审核人用户名；未审核为空串 */
  reviewedBy: string;
  /** 审核时间 ISO 串；未审核为空串 */
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** C 端打手目录/主页的独立脱敏投影 */
export interface BoosterPublicView {
  /** 打手用户 id；目录搜索和订单指定均使用该值 */
  userId: string;
  /** 昵称为空时由服务端生成稳定兜底名，不暴露登录用户名或真实姓名 */
  displayName: string;
  avatar: string;
  gender: BoosterGender | "";
  serviceRegions: BoosterServiceRegion[];
  intro: string;
  completedOrders: number;
  level: number;
  levelName: string;
  voiceUrl: string;
  /** 打手自主维护的持久化上线状态 */
  online: boolean;
  /** 当前登录老板是否可选择该打手下单 */
  selectable: boolean;
  /** 不可选择时的安全提示；可选择时为空串 */
  unavailableReason: string;
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
  /** 配置中心维护的入驻公告图片；未配置为空串 */
  onboardingNoticeImage: string;
}
