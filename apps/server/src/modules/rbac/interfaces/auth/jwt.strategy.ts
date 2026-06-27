import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { loadEnvConfig } from '../../../../bootstrap/env.config';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { PermissionResolver } from '../../application/permission-resolver.service';
import { TokenPayload } from '../../application/token.service';
import { AuthUser } from './metadata';

/**
 * 访问令牌策略。
 * 校验 Authorization: Bearer <accessToken> 的签名与有效期，
 * 通过后把 { id, username } 注入 request.user，并把 tenantId/isSuper 写入租户上下文，
 * 供仓储层做行级数据隔离。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly resolver: PermissionResolver,
    private readonly tenant: TenantContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: loadEnvConfig().jwt.accessSecret,
    });
  }

  async validate(payload: TokenPayload): Promise<AuthUser> {
    const auth = await this.resolver.resolve(payload.sub);
    this.tenant.set(payload.tenantId ?? null, auth.isSuper);
    return { id: payload.sub, username: payload.username };
  }
}
