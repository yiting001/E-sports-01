import { StartServicePayload } from '@app/contracts';
import { IsOptional, IsString, Length } from 'class-validator';

/** 发起客服会话入参 */
export class StartServiceDto implements StartServicePayload {
  @IsOptional()
  @IsString()
  @Length(0, 128)
  subject?: string;
}
