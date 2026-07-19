import { PORTAL_BANNER_LIMITS, PortalBannerItem, UpdatePortalBannerPayload } from '@app/contracts';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

class PortalBannerItemDto implements PortalBannerItem {
  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(PORTAL_BANNER_LIMITS.imageMax)
  @Matches(/^(https?:\/\/|\/)/i, { message: '横幅图片地址仅支持 HTTP(S) 或站内路径' })
  image!: string;

  @Transform(trimStringValue)
  @ValidateIf((_object, value: unknown) => value !== '')
  @IsString()
  @MaxLength(PORTAL_BANNER_LIMITS.activityIdMax)
  @IsUUID('4')
  activityId!: string;
}

/** 更新首页横幅入参校验；空数组表示撤下全部横幅。 */
export class UpdateBannerDto implements UpdatePortalBannerPayload {
  @IsArray()
  @ArrayMaxSize(PORTAL_BANNER_LIMITS.itemsMax)
  @ValidateNested({ each: true })
  @Type(() => PortalBannerItemDto)
  items!: PortalBannerItemDto[];

  @Type(() => Number)
  @IsInt()
  @Min(PORTAL_BANNER_LIMITS.intervalMinSeconds)
  @Max(PORTAL_BANNER_LIMITS.intervalMaxSeconds)
  intervalSeconds!: number;
}
