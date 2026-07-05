/**
 * 排行榜（前后端共享契约）。
 * 纯只读聚合现有数据：打手榜按完成单数、消费榜按会员累计消费，
 * 登录即可查看，无需额外权限；昵称脱敏展示保护隐私。
 */

/** 榜单条目 */
export interface RankEntryView {
  /** 名次（从 1 开始） */
  rank: number;
  /** 展示名（已脱敏） */
  name: string;
  /** 榜单数值：打手榜为完成单数，消费榜为累计消费（分） */
  value: number;
}

/** 排行榜视图 */
export interface RankBoardView {
  /** 打手榜（按完成单数倒序） */
  boosters: RankEntryView[];
  /** 消费榜（按累计消费倒序） */
  spenders: RankEntryView[];
}

/** 榜单条数上限 */
export const RANK_TOP_LIMIT = 10;
