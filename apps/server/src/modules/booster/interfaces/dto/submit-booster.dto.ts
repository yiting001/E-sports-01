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
  SubmitBoosterPayload,
} from '@app/contracts';
import { trimStringValue } from '../../../../shared/http/trim-string.transformer';

/** 提交打手入驻申请入参 */
export class SubmitBoosterDto implements SubmitBoosterPayload {
  @Transform(trimStringValue)
  @IsString()
  @Length(1, BOOSTER_LIMITS.applicantNameMax)
  applicantName!: string;

  @IsEnum(BoosterGender)
  gender!: BoosterGender;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BOOSTER_LIMITS.serviceRegionsMax)
  @ArrayUnique()
  @IsIn(BOOSTER_SERVICE_REGION_VALUES, { each: true })
  serviceRegions!: BoosterServiceRegion[];

  @Transform(trimStringValue)
  @IsString()
  @Length(BOOSTER_LIMITS.introMin, BOOSTER_LIMITS.introMax)
  intro!: string;

  @IsEnum(BoosterContactType)
  contactType!: BoosterContactType;

  @Transform(trimStringValue)
  @IsString()
  @Length(1, BOOSTER_LIMITS.contactValueMax)
  contactValue!: string;

  @Transform(trimStringValue)
  @IsString()
  @MaxLength(BOOSTER_LIMITS.materialImageMax)
  @ValidateIf((_object, value: string) => value !== '')
  @Matches(/^(?:https?:\/\/|\/)/, { message: '材料图片地址格式不正确' })
  materialImage!: string;

  @Transform(trimStringValue)
  @IsString()
  @MaxLength(BOOSTER_LIMITS.invitationCodeMax)
  invitationCode!: string;
}
