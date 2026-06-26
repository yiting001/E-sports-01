import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { loadEnvConfig } from '../../../../bootstrap/env.config';
import { TokenPayload } from '../../application/token.service';
import { AuthUser } from './metadata';

/**
 * 访问令牌策略。
 * 校验 Authorization: Bearer <accessToken> 的签名与有效期，
 * 通过后把 { id, username } 注入到 request.user。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: loadEnvConfig().jwt.accessSecret,
    });
  }

  validate(payload: TokenPayload): AuthUser {
    return { id: payload.sub, username: payload.username };
  }
}
