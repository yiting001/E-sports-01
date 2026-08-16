import { IsOptional, IsString, Length } from 'class-validator';
import { WechatLoginPayload } from '@app/contracts';

/** 微信公众号网页授权登录入参 */
export class WechatLoginDto implements WechatLoginPayload {
  /** 公众号 OAuth 回跳携带的授权码 */
  @IsString()
  @Length(1, 512)
  code!: string;

  /** 租户编码（选填） */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  tenantCode?: string;
}
