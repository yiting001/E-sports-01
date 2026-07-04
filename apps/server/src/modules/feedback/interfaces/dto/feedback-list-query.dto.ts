import { IsEnum, IsOptional } from 'class-validator';
import { FeedbackStatus, FeedbackType } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 反馈列表查询：在通用分页之上增加可选状态/类型过滤 */
export class FeedbackListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;
}
