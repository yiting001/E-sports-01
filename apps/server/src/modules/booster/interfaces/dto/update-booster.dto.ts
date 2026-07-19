import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  BOOSTER_LIMITS,
  BOOSTER_SERVICE_REGION_VALUES,
  BoosterContactType,
  BoosterGender,
  BoosterServiceRegion,
  UpdateBoosterPayload,
} from '@app/contracts';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

/** 管理端编辑打手资料入参（各字段可选，仅更新传入项） */
export class UpdateBoosterDto implements UpdateBoosterPayload {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimStringValue)
  @IsString()
  @Length(1, BOOSTER_LIMITS.applicantNameMax)
  applicantName?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(BoosterGender)
  gender?: BoosterGender;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BOOSTER_LIMITS.serviceRegionsMax)
  @ArrayUnique()
  @IsIn(BOOSTER_SERVICE_REGION_VALUES, { each: true })
  serviceRegions?: BoosterServiceRegion[];

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimStringValue)
  @IsString()
  @Length(BOOSTER_LIMITS.introMin, BOOSTER_LIMITS.introMax)
  intro?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(BoosterContactType)
  contactType?: BoosterContactType;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimStringValue)
  @IsString()
  @Length(1, BOOSTER_LIMITS.contactValueMax)
  contactValue?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimStringValue)
  @IsString()
  @MaxLength(BOOSTER_LIMITS.materialImageMax)
  @ValidateIf((_object, value: unknown) => value !== '')
  @Matches(/^(?:https?:\/\/|\/)/, { message: '材料图片地址格式不正确' })
  materialImage?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimStringValue)
  @IsString()
  @MaxLength(BOOSTER_LIMITS.invitationCodeMax)
  invitationCode?: string;
}
