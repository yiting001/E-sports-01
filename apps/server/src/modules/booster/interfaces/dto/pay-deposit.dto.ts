import { IsInt, Min } from 'class-validator';
import { PayDepositPayload } from '@app/contracts';

/** 打手缴纳押金入参（区间内自选金额，单位分） */
export class PayDepositDto implements PayDepositPayload {
  @IsInt()
  @Min(1)
  amountFen!: number;
}
