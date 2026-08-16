import { IsString, IsUrl, Length } from 'class-validator';

/** 获取微信登录授权地址入参 */
export class WechatLoginAuthorizeUrlQueryDto {
  /** 授权完成后微信回跳的页面地址（须为 HTTP/HTTPS 完整地址） */
  @IsString()
  @Length(1, 1024)
  @IsUrl({ require_tld: false, require_protocol: true }, { message: '回跳地址无效' })
  redirectUri!: string;
}
