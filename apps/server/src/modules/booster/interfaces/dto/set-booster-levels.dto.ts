import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BOOSTER_LEVEL_LIMITS,
  BoosterLevelTier,
  FEE_RATE_BASE,
} from '@app/contracts';

/** 等级档位项 */
export class BoosterLevelTierDto implements BoosterLevelTier {
  @IsInt()
  @Min(1)
  level!: number;

  @IsString()
  @Length(1, BOOSTER_LEVEL_LIMITS.nameMax)
  name!: string;

  @IsInt()
  @Min(0)
  minCompletedOrders!: number;

  @IsInt()
  @Min(0)
  @Max(FEE_RATE_BASE)
  commissionRateBp!: number;
}

/** 保存打手等级档位入参（管理端） */
export class SetBoosterLevelsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BOOSTER_LEVEL_LIMITS.tiersMax)
  @ValidateNested({ each: true })
  @Type(() => BoosterLevelTierDto)
  tiers!: BoosterLevelTierDto[];
}
