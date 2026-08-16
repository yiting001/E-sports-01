import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CONFIG_KEYS, WechatOfficialAuthorizeUrlView } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { WECHAT_OAUTH_PORT, WechatOauthPort } from '../../domain/wechat-oauth-port.interface';

/** 回跳地址仅接受 HTTP(S)，避免把用户重定向到任意协议 */
function assertSafeRedirect(redirectUri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new BadRequestException('回跳地址无效');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BadRequestException('回跳地址仅支持 HTTP(S)');
  }
}

/** 用例：生成微信登录的公众号网页授权地址（公开，开关关闭时拒绝） */
@Injectable()
export class GetWechatLoginUrlUseCase {
  constructor(
    @Inject(WECHAT_OAUTH_PORT) private readonly oauth: WechatOauthPort,
    private readonly config: ConfigService,
  ) {}

  async execute(redirectUri: string): Promise<WechatOfficialAuthorizeUrlView> {
    const enabled = await this.config.getBoolean(
      CONFIG_KEYS.auth.wechatOfficialLoginEnabled,
      false,
    );
    if (!enabled) {
      throw new ForbiddenException('微信登录未开启');
    }
    assertSafeRedirect(redirectUri);
    return { url: await this.oauth.buildAuthorizeUrl(redirectUri) };
  }
}
