import { IsBoolean } from 'class-validator';
import { SetReviewVisibilityPayload } from '@app/contracts';

/** 显隐评论入参 */
export class SetReviewVisibilityDto implements SetReviewVisibilityPayload {
  @IsBoolean()
  visible!: boolean;
}
