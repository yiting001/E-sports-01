import { IsEnum, IsOptional } from 'class-validator';
import { StatsRange } from '@app/contracts';

/** 统计查询入参：时间范围档位（缺省按日） */
export class StatsQueryDto {
  @IsOptional()
  @IsEnum(StatsRange)
  range: StatsRange = StatsRange.Day;
}
