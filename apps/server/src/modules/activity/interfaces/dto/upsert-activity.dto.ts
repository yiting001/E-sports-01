import { ACTIVITY_LIMITS, UpsertActivityPayload } from '@app/contracts';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** 新建/编辑活动入参校验 */
export class UpsertActivityDto implements UpsertActivityPayload {
  @IsString()
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(ACTIVITY_LIMITS.titleMax)
  title!: string;

  @IsString()
  @MaxLength(ACTIVITY_LIMITS.coverMax)
  cover!: string;

  @IsString()
  @MaxLength(ACTIVITY_LIMITS.contentMax)
  content!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsBoolean()
  enabled!: boolean;

  @Type(() => Number)
  @IsInt()
  sort!: number;
}
