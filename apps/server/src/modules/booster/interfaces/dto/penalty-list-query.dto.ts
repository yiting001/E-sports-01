import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 罚款记录列表查询：在通用分页之上增加可选打手过滤 */
export class PenaltyListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 36)
  boosterUserId?: string;
}
