import {
  CreateOrderPayload,
  ORDER_LIMITS,
  PaymentProvider,
} from '@app/contracts';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** 创建订单入参校验 */
export class CreateOrderDto implements CreateOrderPayload {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(ORDER_LIMITS.quantityMin)
  @Max(ORDER_LIMITS.quantityMax)
  quantity!: number;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsOptional()
  @IsString()
  @MaxLength(ORDER_LIMITS.remarkMax)
  remark?: string;

  @IsOptional()
  @IsString()
  userCouponId?: string;
}
