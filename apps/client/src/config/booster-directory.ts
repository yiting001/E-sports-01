import { BoosterGender } from '@app/contracts';

/** 打手目录性别筛选项，列表与资料展示共用同一文案。 */
export const BOOSTER_GENDER_FILTERS = [
  { label: '全部', value: '' },
  { label: '男神', value: BoosterGender.Male },
  { label: '女神', value: BoosterGender.Female },
] as const;

export const BOOSTER_GENDER_TEXT: Record<BoosterGender | '', string> = {
  '': '未设置',
  [BoosterGender.Male]: '男',
  [BoosterGender.Female]: '女',
};

/** 在线状态仅作即时参考，目录停留期间定时刷新服务端快照。 */
export const BOOSTER_PRESENCE_REFRESH_MS = 15_000;
