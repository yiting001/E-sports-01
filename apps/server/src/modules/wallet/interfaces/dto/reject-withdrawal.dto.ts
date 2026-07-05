import { IsString, Length } from 'class-validator';
import { RejectWithdrawalBody } from '@app/contracts';

/** 驳回提现入参 DTO */
export class RejectWithdrawalDto implements RejectWithdrawalBody {
  /** 驳回原因（回填到工单并展示给用户） */
  @IsString()
  @Length(1, 200)
  reason!: string;
}
