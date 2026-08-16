import { randomBytes } from 'node:crypto';
import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { CONFIG_KEYS, TokenPair, WechatLoginPayload } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { MEMBER_ROLE } from '../../domain/rbac.constants';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role-repository.interface';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { User, UserStatus } from '../../domain/user.entity';
import {
  WECHAT_IDENTITY_REPOSITORY,
  WechatIdentityRepository,
} from '../../domain/wechat-identity-repository.interface';
import { WECHAT_OAUTH_PORT, WechatOauthPort } from '../../domain/wechat-oauth-port.interface';
import { PasswordService } from '../../infrastructure/password.service';
import { TenantResolver } from '../tenant-resolver.service';
import { TokenService } from '../token.service';

/**
 * 用例：微信公众号网页授权登录（配置中心开关控制）。
 * 授权码换取 openid → 租户内已绑定则直接登录；
 * 未绑定则自动注册 member 账号（无口令、无手机号，仅能微信登录）并落身份绑定。
 * 并发首登撞唯一约束时回查绑定按已注册账号登录，保证幂等。
 */
@Injectable()
export class WechatLoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(WECHAT_IDENTITY_REPOSITORY)
    private readonly identities: WechatIdentityRepository,
    @Inject(WECHAT_OAUTH_PORT) private readonly oauth: WechatOauthPort,
    private readonly config: ConfigService,
    private readonly password: PasswordService,
    private readonly token: TokenService,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(payload: WechatLoginPayload): Promise<TokenPair> {
    const enabled = await this.config.getBoolean(
      CONFIG_KEYS.auth.wechatOfficialLoginEnabled,
      false,
    );
    if (!enabled) {
      throw new ForbiddenException('微信登录未开启');
    }
    const tenantId = await this.tenants.resolveForWrite(payload.tenantCode);
    const openid = await this.oauth.exchangeOpenid(payload.code);
    const bound = await this.identities.findByOpenid(openid, tenantId);
    if (bound) {
      return this.loginAs(bound.userId);
    }
    const user = await this.registerMember(tenantId);
    try {
      await this.identities.save({ userId: user.id, openid, tenantId });
    } catch {
      // 并发首登：绑定被他请求先落库，回查后按已注册账号登录，并清理本次多余账号
      await this.userRepo.remove(user.id);
      const existing = await this.identities.findByOpenid(openid, tenantId);
      if (!existing) {
        throw new InternalServerErrorException('微信登录绑定失败，请重试');
      }
      return this.loginAs(existing.userId);
    }
    return this.token.issueTokenPair(user.id, user.username, user.tenantId);
  }

  /** 按已绑定用户签发令牌；账号被禁用或租户停用时拒绝。 */
  private async loginAs(userId: string): Promise<TokenPair> {
    const user = await this.userRepo.findById(userId);
    if (!user || user.status !== UserStatus.Enabled) {
      throw new UnauthorizedException('账号不存在或已禁用');
    }
    await this.tenants.assertTenantEnabled(user.tenantId);
    return this.token.issueTokenPair(user.id, user.username, user.tenantId);
  }

  /** 首登自动注册普通用户：随机不可逆口令（只能微信登录）、默认 member 角色。 */
  private async registerMember(tenantId: string): Promise<User> {
    const memberRole = await this.roleRepo.findByCodeForTenant(MEMBER_ROLE, tenantId);
    if (!memberRole) {
      throw new InternalServerErrorException('缺少默认用户角色，请联系管理员');
    }
    const username = await this.generateUsername(tenantId);
    const entity = this.userRepo.create({
      username,
      passwordHash: await this.password.hash(randomBytes(32).toString('hex')),
      nickname: `微信用户${username.slice(-4)}`,
      phone: '',
      roles: [memberRole],
      tenantId,
    });
    return this.userRepo.save(entity);
  }

  /** 生成租户内唯一用户名（wx_ + 随机十六进制，命中占用重试）。 */
  private async generateUsername(tenantId: string): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const candidate = `wx_${randomBytes(4).toString('hex')}`;
      if (!(await this.userRepo.existsByUsername(candidate, tenantId))) {
        return candidate;
      }
    }
    throw new InternalServerErrorException('用户名生成失败，请重试');
  }
}
