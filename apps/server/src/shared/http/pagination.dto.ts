import { PAGINATION_DEFAULTS, PaginationQuery } from '@app/contracts';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** 通用分页查询 DTO，供各模块列表接口复用 */
export class PaginationQueryDto implements PaginationQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PAGINATION_DEFAULTS.page;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_DEFAULTS.maxPageSize)
  pageSize: number = PAGINATION_DEFAULTS.pageSize;

  /** 计算 TypeORM skip 值 */
  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }
}
