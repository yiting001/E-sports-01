import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  BOOSTER_SERVICE_REGION_LIMITS,
  BoosterServiceRegionOption,
} from '@app/contracts';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

/** 接单区服选项项 */
export class BoosterRegionOptionDto implements BoosterServiceRegionOption {
  @Transform(trimStringValue)
  @IsString()
  @Length(1, BOOSTER_SERVICE_REGION_LIMITS.valueMax)
  @Matches(BOOSTER_SERVICE_REGION_LIMITS.valuePattern, {
    message: '区服值仅允许小写字母/数字/短横线',
  })
  value!: string;

  @Transform(trimStringValue)
  @IsString()
  @Length(1, BOOSTER_SERVICE_REGION_LIMITS.labelMax)
  label!: string;
}

/** 保存接单区服选项入参（管理端） */
export class SetBoosterRegionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BOOSTER_SERVICE_REGION_LIMITS.optionsMax)
  @ValidateNested({ each: true })
  @Type(() => BoosterRegionOptionDto)
  options!: BoosterRegionOptionDto[];
}
