import {
  BOOSTER_LIMITS,
  BOOSTER_SERVICE_REGION_VALUES,
  BoosterGender,
  BoosterServiceRegion,
} from '@app/contracts';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

export class BoosterDirectoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimStringValue)
  @IsString()
  @MaxLength(BOOSTER_LIMITS.directoryKeywordMax)
  keyword?: string;

  @IsOptional()
  @IsEnum(BoosterGender)
  gender?: BoosterGender;

  @IsOptional()
  @IsIn(BOOSTER_SERVICE_REGION_VALUES)
  serviceRegion?: BoosterServiceRegion;
}
