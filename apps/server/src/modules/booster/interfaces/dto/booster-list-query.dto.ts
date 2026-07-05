import { IsEnum, IsOptional } from 'class-validator';
import { BoosterStatus } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 打手管理列表查询：在通用分页之上增加可选状态过滤 */
export class BoosterListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BoosterStatus)
  status?: BoosterStatus;
}
