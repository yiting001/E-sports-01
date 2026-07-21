import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { FEEDBACK_LIMITS, FeedbackType } from '@app/contracts';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

/** 提交反馈入参 */
export class SubmitFeedbackDto {
  @IsEnum(FeedbackType)
  type!: FeedbackType;

  @IsOptional()
  @Transform(trimStringValue)
  @IsString()
  @MaxLength(FEEDBACK_LIMITS.targetMax)
  target?: string;

  @IsOptional()
  @Transform(trimStringValue)
  @IsUUID()
  orderId?: string;

  @Transform(trimStringValue)
  @IsString()
  @Length(FEEDBACK_LIMITS.contentMin, FEEDBACK_LIMITS.contentMax)
  content!: string;
}
