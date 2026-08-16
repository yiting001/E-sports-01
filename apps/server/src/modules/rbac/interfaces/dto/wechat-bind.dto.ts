import { IsString, Length } from 'class-validator';
import { WechatBindPayload } from '@app/contracts';

/** 登录态绑定微信登录身份入参 */
export class WechatBindDto implements WechatBindPayload {
  /** 公众号 OAuth 回跳携带的授权码 */
  @IsString()
  @Length(1, 512)
  code!: string;
}
