/**
 * 实名认证（前后端共享契约）。
 * 用户提交真实姓名 + 身份证号 + 证件正反面照片，经管理员审核后通过/驳回；
 * 超级管理员可配置「哪些角色需要实名」，命中角色的用户被要求完成认证。
 */

/** 大陆居民身份证号：18 位，末位可为 X（仅作格式校验，不校验校验码） */
export const CHINA_ID_CARD_PATTERN = /^\d{17}[\dXx]$/;

/** 实名认证状态 */
export enum RealnameStatus {
  /** 尚未提交 */
  None = 'none',
  /** 已提交，待审核 */
  Pending = 'pending',
  /** 审核通过 */
  Approved = 'approved',
  /** 审核驳回，可重新提交 */
  Rejected = 'rejected',
}

/** 提交实名认证入参 */
export interface SubmitRealnamePayload {
  /** 真实姓名 */
  realName: string;
  /** 身份证号（18 位，提交后加密入库、对外脱敏） */
  idCardNo: string;
  /** 证件正面（人像面）图片 URL，先经自助上传得到 */
  frontImage: string;
  /** 证件反面（国徽面）图片 URL */
  backImage: string;
}

/** 审核实名认证入参 */
export interface ReviewRealnamePayload {
  /** 是否通过 */
  approve: boolean;
  /** 驳回理由（approve=false 时必填） */
  rejectReason?: string;
}

/** 实名记录脱敏视图（管理端审核列表/用户本人查看共用） */
export interface RealnameView {
  id: string;
  userId: string;
  /** 用户名（管理端展示） */
  username: string;
  /** 昵称（管理端展示） */
  nickname: string;
  realName: string;
  /** 脱敏身份证号，例如 110***********1234 */
  idCardMasked: string;
  frontImage: string;
  backImage: string;
  status: RealnameStatus;
  rejectReason: string;
  /** 审核人用户名；未审核为空串 */
  reviewedBy: string;
  /** 审核时间 ISO 串；未审核为空串 */
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** 当前用户实名认证概览 */
export interface RealnameMineView {
  /** 当前用户是否被要求实名（其任一角色命中需实名集合） */
  required: boolean;
  /** 聚合状态：无记录为 none，否则取记录状态 */
  status: RealnameStatus;
  /** 已提交时返回脱敏记录，未提交为 null */
  record: RealnameView | null;
}

/** 实名策略视图（哪些角色需实名） */
export interface RealnamePolicyView {
  /** 需实名的角色 code 集合 */
  requiredRoleCodes: string[];
}

/** 设置实名策略入参 */
export interface SetRealnamePolicyPayload {
  requiredRoleCodes: string[];
}

/** 配置中心键：需实名的角色 code 集合（JSON 数组） */
export const REALNAME_REQUIRED_ROLES_KEY = 'realname.requiredRoleCodes';

/**
 * 身份证号脱敏：保留前 3 位与后 4 位，中间以 * 掩盖。
 * 非 18 位输入按通用规则尽力脱敏，避免泄露完整号码。
 */
export function maskIdCard(idCardNo: string): string {
  const value = idCardNo.trim();
  if (value.length < 8) {
    return '*'.repeat(value.length);
  }
  const head = value.slice(0, 3);
  const tail = value.slice(-4);
  return `${head}${'*'.repeat(value.length - 7)}${tail}`;
}
