import { ArrayMaxSize, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PAGINATION_DEFAULTS } from '@app/contracts';

/** 已评价订单查询：逗号分隔的订单 id 列表（一页订单的量级） */
export class ReviewedOrdersQueryDto {
  @Transform(({ value }: { value: string }) =>
    String(value ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(PAGINATION_DEFAULTS.maxPageSize)
  orderIds!: string[];
}
