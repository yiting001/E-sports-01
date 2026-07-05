import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { REVIEW_LIMITS } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 管理端评论列表查询：在通用分页之上增加可选星级/可见状态过滤 */
export class ReviewAdminListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(REVIEW_LIMITS.ratingMin)
  @Max(REVIEW_LIMITS.ratingMax)
  rating?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  visible?: boolean;
}
