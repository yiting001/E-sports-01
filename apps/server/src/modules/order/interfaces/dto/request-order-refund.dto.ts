import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { ORDER_REFUND_LIMITS, RequestOrderRefundPayload } from '@app/contracts';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

export class RequestOrderRefundDto implements RequestOrderRefundPayload {
  @Transform(trimStringValue)
  @IsString()
  @Length(1, ORDER_REFUND_LIMITS.reasonMax)
  reason!: string;
}
