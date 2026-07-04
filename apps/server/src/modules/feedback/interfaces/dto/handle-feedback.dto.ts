import { IsString, Length } from 'class-validator';
import { FEEDBACK_LIMITS, HandleFeedbackPayload } from '@app/contracts';

/** 处理反馈入参 */
export class HandleFeedbackDto implements HandleFeedbackPayload {
  @IsString()
  @Length(1, FEEDBACK_LIMITS.replyMax)
  replyContent!: string;
}
