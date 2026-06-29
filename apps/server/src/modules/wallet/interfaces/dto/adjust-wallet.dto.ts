import { IsEnum, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AdjustWalletBody, FundDirection } from '@app/contracts';

/** 管理端人工调整余额入参 DTO */
export class AdjustWalletDto implements AdjustWalletBody {
  /** 调整方向：入账=增加余额，出账=扣减余额 */
  @IsEnum(FundDirection)
  direction!: FundDirection;

  /** 调整金额（分），至少 1 分 */
  @IsInt()
  @Min(1)
  amountFen!: number;

  /** 调整备注（必填，便于审计追溯） */
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  remark!: string;
}
