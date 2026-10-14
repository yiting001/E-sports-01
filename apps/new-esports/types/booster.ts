/**
 * 打手/区服契约的最小镜像（单一来源：packages/contracts/src/booster/booster.ts）。
 * 下单页需要区服选项（手机端/电脑端）与其语义值，价格按区服解析。
 */

/** 区服语义值常量（后端固定两档） */
export const BOOSTER_SERVICE_REGION = {
  Mobile: 'delta-mobile',
  Pc: 'delta-pc',
} as const;

export type BoosterServiceRegion = string;

/** 区服选项（语义值 + 展示名） */
export interface BoosterServiceRegionOption {
  value: BoosterServiceRegion;
  label: string;
}

/** 默认开放的区服（后端未配置时的回退，与契约保持一致） */
export const BOOSTER_SERVICE_REGIONS: readonly BoosterServiceRegionOption[] = [
  { value: BOOSTER_SERVICE_REGION.Mobile, label: '三角洲 - 手机端' },
  { value: BOOSTER_SERVICE_REGION.Pc, label: '三角洲 - 电脑端' },
] as const;
