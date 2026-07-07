/**
 * 邀请（前后端共享契约）。
 * C 端每人一个邀请码，好友填码绑定邀请关系；
 * 绑定成功按后台配置向邀请人/被邀请人发放奖励（优惠券或钱包金额）。
 */

/** 邀请奖励方式 */
export enum InviteRewardType {
  /** 不发奖励 */
  None = 'none',
  /** 发放指定优惠券 */
  Coupon = 'coupon',
  /** 钱包入账指定金额 */
  Wallet = 'wallet',
}

/** 奖励方式展示文案 */
export const INVITE_REWARD_TYPE_TEXT: Record<InviteRewardType, string> = {
  [InviteRewardType.None]: '不发放',
  [InviteRewardType.Coupon]: '优惠券',
  [InviteRewardType.Wallet]: '钱包金额',
};

/** 邀请码字段约束 */
export const INVITE_LIMITS = {
  /** 邀请码长度 */
  codeLength: 8,
} as const;

/** 单侧奖励配置（邀请人 / 被邀请人各一份） */
export interface InviteRewardConfig {
  rewardType: InviteRewardType;
  /** 奖励优惠券模板 id（rewardType 为 coupon 时必填） */
  couponId: string;
  /** 钱包入账金额（分，rewardType 为 wallet 时必填） */
  amountFen: number;
}

/** 邀请奖励配置（管理端读写，落配置中心） */
export interface InviteConfigView {
  /** 邀请人奖励 */
  inviter: InviteRewardConfig;
  /** 被邀请人奖励 */
  invitee: InviteRewardConfig;
  /** 邀请规则说明（富文本 HTML，C 端邀请页展示，空串不展示） */
  rulesHtml: string;
}

/** C 端我的邀请视图 */
export interface MyInviteView {
  /** 我的邀请码 */
  code: string;
  /** 我是否已绑定过邀请人（绑定后不可再填码） */
  bound: boolean;
  /** 邀请人当前可得奖励说明（如「优惠券『满50减10』」/「钱包入账 5.00 元」，不发放为空串） */
  inviterRewardText: string;
  /** 被邀请人当前可得奖励说明 */
  inviteeRewardText: string;
  /** 邀请规则说明（富文本 HTML，空串不展示） */
  rulesHtml: string;
  /** 我的邀请记录（我邀请到的人） */
  records: InviteRecordView[];
}

/** C 端邀请记录项 */
export interface InviteRecordView {
  id: string;
  /** 被邀请人昵称/用户名（脱敏展示） */
  inviteeName: string;
  /** 我获得的奖励说明快照 */
  inviterRewardText: string;
  createdAt: string;
}

/** 填码绑定入参 */
export interface BindInviteBody {
  /** 邀请码 */
  code: string;
}

/** 管理端邀请记录列表项 */
export interface InviteRecordAdminView {
  id: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeName: string;
  /** 邀请人奖励发放结果快照 */
  inviterRewardText: string;
  /** 被邀请人奖励发放结果快照 */
  inviteeRewardText: string;
  createdAt: string;
}
