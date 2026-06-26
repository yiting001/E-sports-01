import { IsString, Length } from 'class-validator';

/** 打开私聊入参 */
export class OpenPrivateDto {
  @IsString()
  @Length(1, 36)
  peerId!: string;
}
