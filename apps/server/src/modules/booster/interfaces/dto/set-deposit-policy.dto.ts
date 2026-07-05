import { IsInt, Min } from 'class-validator';
import { BoosterDepositPolicy } from '@app/contracts';

/** 保存押金交付策略入参（管理端，最低/最高交付额，单位分） */
export class SetDepositPolicyDto implements BoosterDepositPolicy {
  @IsInt()
  @Min(0)
  minFen!: number;

  @IsInt()
  @Min(0)
  maxFen!: number;
}
