import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMarketingReviewPayload, REVIEW_LIMITS } from '@app/contracts';

/** 营销工具：管理端为商品添加评论入参 */
export class CreateMarketingReviewDto implements CreateMarketingReviewPayload {
  @IsUUID()
  productId!: string;

  @IsString()
  @Length(REVIEW_LIMITS.reviewerNameMin, REVIEW_LIMITS.reviewerNameMax)
  reviewerName!: string;

  @IsOptional()
  @IsString()
  @Length(0, REVIEW_LIMITS.avatarMax)
  avatar?: string;

  @Type(() => Number)
  @IsInt()
  @Min(REVIEW_LIMITS.ratingMin)
  @Max(REVIEW_LIMITS.ratingMax)
  rating!: number;

  @IsString()
  @Length(REVIEW_LIMITS.contentMin, REVIEW_LIMITS.contentMax)
  content!: string;
}
