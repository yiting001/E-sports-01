import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** 日志清理 DTO：可选保留天数，缺省时回退配置中心 */
export class PurgeLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}
