import {
  BOOSTER_SERVICE_REGIONS,
  BoosterContactType,
  BoosterGender,
  type BoosterServiceRegion,
} from '@app/contracts';

export const BOOSTER_GENDER_OPTIONS = [
  { value: BoosterGender.Male, label: '男' },
  { value: BoosterGender.Female, label: '女' },
] as const;

export const BOOSTER_CONTACT_OPTIONS = [
  { value: BoosterContactType.Phone, label: '手机号' },
  { value: BoosterContactType.Wechat, label: '微信' },
  { value: BoosterContactType.QQ, label: 'QQ' },
] as const;

export function genderLabel(value: BoosterGender | ''): string {
  return BOOSTER_GENDER_OPTIONS.find((option) => option.value === value)?.label ?? '未填写';
}

export function contactTypeLabel(value: BoosterContactType | ''): string {
  return BOOSTER_CONTACT_OPTIONS.find((option) => option.value === value)?.label ?? '联系方式';
}

export function serviceRegionLabel(value: BoosterServiceRegion): string {
  return BOOSTER_SERVICE_REGIONS.find((option) => option.value === value)?.label ?? value;
}
