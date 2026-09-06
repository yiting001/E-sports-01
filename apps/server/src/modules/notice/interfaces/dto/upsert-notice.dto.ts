import { NOTICE_LIMITS, UpsertNoticePayload } from '@app/contracts';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsString, MaxLength, MinLength } from 'class-validator';

/** 新建/编辑通知入参校验 */
export class UpsertNoticeDto implements UpsertNoticePayload {
  @IsString()
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(NOTICE_LIMITS.titleMax)
  title!: string;

  @IsString()
  @MaxLength(NOTICE_LIMITS.contentMax)
  content!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsBoolean()
  popup!: boolean;

  @IsBoolean()
  popupFlame!: boolean;

  @Type(() => Number)
  @IsInt()
  sort!: number;
}
