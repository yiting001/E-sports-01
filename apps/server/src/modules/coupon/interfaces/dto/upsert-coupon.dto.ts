import {
  COUPON_LIMITS,
  CouponAudience,
  CouponType,
  UpsertCouponPayload,
} from '@app/contracts';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** 新建/编辑优惠券入参校验 */
export class UpsertCouponDto implements UpsertCouponPayload {
  @IsString()
  @MinLength(1, { message: '券名不能为空' })
  @MaxLength(COUPON_LIMITS.titleMax)
  title!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '面值须大于 0' })
  value!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  thresholdFen!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(COUPON_LIMITS.totalCountMax)
  totalCount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(COUPON_LIMITS.perUserLimitMax)
  perUserLimit!: number;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsEnum(CouponAudience)
  audience!: CouponAudience;
}
