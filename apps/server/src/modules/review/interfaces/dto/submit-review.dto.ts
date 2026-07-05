import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { REVIEW_LIMITS, SubmitReviewPayload } from '@app/contracts';

/** 提交评论入参 */
export class SubmitReviewDto implements SubmitReviewPayload {
  @IsUUID()
  orderId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(REVIEW_LIMITS.ratingMin)
  @Max(REVIEW_LIMITS.ratingMax)
  rating!: number;

  @IsString()
  @Length(REVIEW_LIMITS.contentMin, REVIEW_LIMITS.contentMax)
  content!: string;
}
