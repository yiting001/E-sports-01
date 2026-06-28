import { IsEnum, IsOptional } from 'class-validator';
import { RealnameStatus } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 实名审核列表查询：在通用分页之上增加可选状态过滤 */
export class RealnameListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RealnameStatus)
  status?: RealnameStatus;
}
