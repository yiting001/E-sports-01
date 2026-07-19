import { BOOSTER_LIMITS, BoosterStatus } from '@app/contracts';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

/** 打手管理列表查询：在通用分页之上增加可选状态和名称/注册手机号过滤 */
export class BoosterListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BoosterStatus)
  status?: BoosterStatus;

  @IsOptional()
  @Transform(trimStringValue)
  @IsString()
  @MaxLength(BOOSTER_LIMITS.directoryKeywordMax)
  keyword?: string;
}
