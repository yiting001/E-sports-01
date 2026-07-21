import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsString, Length, Max, Min } from 'class-validator';
import {
  FEEDBACK_LIMITS,
  PENALTY_LIMITS,
  PenaltySource,
  type CreateFeedbackPenaltyBody,
} from '@app/contracts';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

/** 从投诉记录直接扣款的管理端入参 */
export class CreateFeedbackPenaltyDto implements CreateFeedbackPenaltyBody {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountFen!: number;

  @IsEnum(PenaltySource)
  source!: PenaltySource;

  @Transform(trimStringValue)
  @IsString()
  @Length(1, PENALTY_LIMITS.reasonMax)
  reason!: string;

  @Transform(trimStringValue)
  @IsString()
  @Length(1, FEEDBACK_LIMITS.replyMax)
  replyContent!: string;
}
