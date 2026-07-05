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
  FEE_RATE_BASE,
  MEMBER_LEVEL_LIMITS,
  MemberLevelTier,
} from '@app/contracts';

/** 会员档位项 */
export class MemberLevelTierDto implements MemberLevelTier {
  @IsInt()
  @Min(1)
  level!: number;

  @IsString()
  @Length(1, MEMBER_LEVEL_LIMITS.nameMax)
  name!: string;

  @IsInt()
  @Min(0)
  minSpendFen!: number;

  @IsInt()
  @Min(1)
  @Max(FEE_RATE_BASE)
  discountBp!: number;
}

/** 保存会员等级档位入参（管理端） */
export class SetMemberLevelsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MEMBER_LEVEL_LIMITS.tiersMax)
  @ValidateNested({ each: true })
  @Type(() => MemberLevelTierDto)
  tiers!: MemberLevelTierDto[];
}
