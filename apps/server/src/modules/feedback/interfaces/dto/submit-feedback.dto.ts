import { IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import {
  FEEDBACK_LIMITS,
  FeedbackType,
  SubmitFeedbackPayload,
} from '@app/contracts';

/** 提交反馈入参 */
export class SubmitFeedbackDto implements SubmitFeedbackPayload {
  @IsEnum(FeedbackType)
  type!: FeedbackType;

  @IsOptional()
  @IsString()
  @MaxLength(FEEDBACK_LIMITS.targetMax)
  target?: string;

  @IsString()
  @Length(FEEDBACK_LIMITS.contentMin, FEEDBACK_LIMITS.contentMax)
  content!: string;
}
