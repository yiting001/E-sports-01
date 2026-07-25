import {
  BOOSTER_SERVICE_REGION_VALUES,
  type HallOrderQuery,
  type BoosterServiceRegion,
} from '@app/contracts';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

/** 接单大厅查询约束；关键字只匹配订单号和商品标题。 */
export class OrderHallListQueryDto extends PaginationQueryDto implements HallOrderQuery {
  @IsOptional()
  @Transform(trimStringValue)
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @IsOptional()
  @IsIn(BOOSTER_SERVICE_REGION_VALUES)
  serviceRegion?: BoosterServiceRegion;
}
