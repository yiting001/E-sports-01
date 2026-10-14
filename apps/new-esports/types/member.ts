/**
 * 会员契约的最小镜像（单一来源：packages/contracts/src/member/member.ts）。
 * 仅镜像本工程消费的字段；接入 workspace 后改用 @app/contracts。
 */

/** 会员等级档位（管理端配置、C 端展示规则） */
export interface MemberLevelTier {
  /** 等级序号（从 1 开始递增） */
  level: number;
  /** 等级名称 */
  name: string;
  /** 晋升到该等级所需累计消费金额（分） */
  minSpendFen: number;
  /** 该等级下单折扣（万分比，10000 = 不打折，9500 = 95 折） */
  discountBp: number;
}

/** 当前用户会员等级视图 */
export interface MemberMineView {
  level: number;
  levelName: string;
  /** 当前下单折扣（万分比） */
  discountBp: number;
  /** 累计消费金额（分） */
  spendFen: number;
  spendYuan: string;
  /** 下一等级名称（已是最高档为空串） */
  nextLevelName: string;
  /** 晋升下一等级还需消费金额（分，已是最高档为 0） */
  nextNeedFen: number;
}
