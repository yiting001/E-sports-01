import { IsString, Length, Matches } from 'class-validator';
import { CHINA_ID_CARD_PATTERN, SubmitRealnamePayload } from '@app/contracts';

/** 提交实名认证入参 */
export class SubmitRealnameDto implements SubmitRealnamePayload {
  @IsString()
  @Length(2, 64)
  realName!: string;

  @Matches(CHINA_ID_CARD_PATTERN, { message: '身份证号格式不正确' })
  idCardNo!: string;

  @IsString()
  @Length(1, 512)
  frontImage!: string;

  @IsString()
  @Length(1, 512)
  backImage!: string;
}
