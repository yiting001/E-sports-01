import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  FEE_RATE_BASE,
  SaveWithdrawTaxConfigBody,
  WITHDRAW_TAX_TIERS_MAX,
  WithdrawTaxTier,
} from '@app/contracts';

/** 阶梯税费档位项 */
export class WithdrawTaxTierDto implements WithdrawTaxTier {
  /** 档位起始金额（分，含），0 表示从任意金额起 */
  @IsInt()
  @Min(0)
  minFen!: number;

  /** 该档税费率（万分比，如 100 = 1%） */
  @IsInt()
  @Min(0)
  @Max(FEE_RATE_BASE)
  rateBp!: number;
}

/** 保存税务配置入参（空数组表示清空阶梯，回退单一费率） */
export class SaveWithdrawTaxConfigDto implements SaveWithdrawTaxConfigBody {
  @IsArray()
  @ArrayMaxSize(WITHDRAW_TAX_TIERS_MAX)
  @ValidateNested({ each: true })
  @Type(() => WithdrawTaxTierDto)
  tiers!: WithdrawTaxTierDto[];
}
