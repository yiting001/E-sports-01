import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { ORDER_REFUND_LIMITS, RejectOrderRefundPayload } from '@app/contracts';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

export class RejectOrderRefundDto implements RejectOrderRefundPayload {
  @Transform(trimStringValue)
  @IsString()
  @Length(1, ORDER_REFUND_LIMITS.reviewReasonMax)
  reason!: string;
}
