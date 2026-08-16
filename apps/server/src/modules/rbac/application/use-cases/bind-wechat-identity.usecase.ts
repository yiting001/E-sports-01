import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { WechatIdentityStatusView } from '@app/contracts';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import {
  WECHAT_IDENTITY_REPOSITORY,
  WechatIdentityRepository,
} from '../../domain/wechat-identity-repository.interface';
import { WECHAT_OAUTH_PORT, WechatOauthPort } from '../../domain/wechat-oauth-port.interface';

/**
 * 用例：登录态绑定微信登录身份（短信/密码用户在微信内 JSAPI 支付前补绑 openid）。
 * openid 由服务端向微信换取；同 openid 重复绑定幂等成功，
 * openid 已被他人占用或本人已绑其他微信则拒绝，避免身份串号。
 */
@Injectable()
export class BindWechatIdentityUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(WECHAT_IDENTITY_REPOSITORY)
    private readonly identities: WechatIdentityRepository,
    @Inject(WECHAT_OAUTH_PORT) private readonly oauth: WechatOauthPort,
  ) {}

  async execute(userId: string, code: string): Promise<WechatIdentityStatusView> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException('账号不存在');
    }
    const openid = await this.oauth.exchangeOpenid(code);
    const [byOpenid, byUser] = await Promise.all([
      this.identities.findByOpenid(openid, user.tenantId),
      this.identities.findByUser(userId, user.tenantId),
    ]);
    if (byUser) {
      if (byUser.openid === openid) {
        return { bound: true };
      }
      throw new ConflictException('当前账号已绑定其他微信');
    }
    if (byOpenid) {
      throw new ConflictException('该微信已绑定其他账号');
    }
    await this.identities.save({ userId, openid, tenantId: user.tenantId });
    return { bound: true };
  }
}
