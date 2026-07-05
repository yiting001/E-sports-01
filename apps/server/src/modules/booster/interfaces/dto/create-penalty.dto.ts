import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import {
  CreatePenaltyBody,
  PENALTY_LIMITS,
  PenaltySource,
} from '@app/contracts';

/** 创建罚款入参（财务） */
export class CreatePenaltyDto implements CreatePenaltyBody {
  @IsString()
  @Length(1, 36)
  boosterUserId!: string;

  /** 罚款金额（分，正整数） */
  @IsInt()
  @Min(1)
  amountFen!: number;

  @IsEnum(PenaltySource)
  source!: PenaltySource;

  @IsString()
  @Length(1, PENALTY_LIMITS.reasonMax)
  reason!: string;

  @IsOptional()
  @IsString()
  @Length(1, PENALTY_LIMITS.orderNoMax)
  orderNo?: string;
}
