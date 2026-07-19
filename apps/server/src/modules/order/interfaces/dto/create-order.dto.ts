import {
  CreateOrderPayload,
  BOOSTER_SERVICE_REGION_VALUES,
  ORDER_LIMITS,
  BoosterServiceRegion,
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  RemarkMediaItem,
  RemarkMediaType,
} from '@app/contracts';
import { Transform, Type } from 'class-transformer';
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
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

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

  @IsEnum(OrderPaymentMethod)
  provider!: OrderPaymentMethod;

  @Transform(trimStringValue)
  @IsString()
  @Matches(/^\d{1,32}$/, { message: '数字游戏 ID 必须为 1～32 位数字' })
  gameAccountId!: string;

  @IsOptional()
  @Transform(trimStringValue)
  @IsString()
  @MaxLength(ORDER_LIMITS.gameTextIdMax)
  gameTextId?: string;

  @IsIn(BOOSTER_SERVICE_REGION_VALUES)
  serviceRegion!: BoosterServiceRegion;

  @IsEnum(OrderBoosterSelectionMode)
  boosterSelectionMode!: OrderBoosterSelectionMode;

  @ValidateIf(
    (dto: CreateOrderDto) =>
      dto.boosterSelectionMode === OrderBoosterSelectionMode.Specified ||
      dto.requestedBoosterId !== undefined,
  )
  @Transform(trimStringValue)
  @IsUUID()
  requestedBoosterId?: string;

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
