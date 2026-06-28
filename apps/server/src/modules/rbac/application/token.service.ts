import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CONFIG_KEYS, TokenPair } from '@app/contracts';
import { loadEnvConfig } from '../../../bootstrap/env.config';
import { ConfigService } from '../../config/application/config.service';

/** JWT 载荷 */
export interface TokenPayload {
  sub: string;
  username: string;
  /** 所属租户主键，用于行级数据隔离 */
  tenantId: string;
  type: 'access' | 'refresh';
}

/**
 * 令牌服务。
 * 签发/校验访问与刷新令牌；密钥来自部署级 env，TTL 来自配置中心（可热调）。
 */
@Injectable()
export class TokenService {
  private readonly env = loadEnvConfig();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issueTokenPair(
    userId: string,
    username: string,
    tenantId: string,
  ): Promise<TokenPair> {
    const accessTtl = await this.config.getNumber(CONFIG_KEYS.auth.accessTokenTtl, 3600);
    const refreshTtl = await this.config.getNumber(CONFIG_KEYS.auth.refreshTokenTtl, 604800);

    const accessToken = await this.jwt.signAsync(
      { sub: userId, username, tenantId, type: 'access' } satisfies TokenPayload,
      { secret: this.env.jwt.accessSecret, expiresIn: accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, username, tenantId, type: 'refresh' } satisfies TokenPayload,
      { secret: this.env.jwt.refreshSecret, expiresIn: refreshTtl },
    );
    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  verifyRefresh(token: string): Promise<TokenPayload> {
    return this.jwt.verifyAsync<TokenPayload>(token, { secret: this.env.jwt.refreshSecret });
  }

  verifyAccess(token: string): Promise<TokenPayload> {
    return this.jwt.verifyAsync<TokenPayload>(token, { secret: this.env.jwt.accessSecret });
  }
}
