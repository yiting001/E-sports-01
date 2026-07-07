import {
  CreateOrderPayload,
  ORDER_LIMITS,
  PaymentProvider,
  RemarkMediaItem,
  RemarkMediaType,
} from '@app/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** 备注附件项校验（图片/视频 URL） */
export class RemarkMediaItemDto implements RemarkMediaItem {
  @IsIn(['image', 'video'])
  type!: RemarkMediaType;

  @IsString()
  @MaxLength(512)
  url!: string;
}

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
  @IsArray()
  @ArrayMaxSize(ORDER_LIMITS.remarkMediaMax)
  @ValidateNested({ each: true })
  @Type(() => RemarkMediaItemDto)
  remarkMedia?: RemarkMediaItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(ORDER_LIMITS.accountInfoMax)
  accountInfo?: string;

  @IsOptional()
  @IsString()
  userCouponId?: string;
}
