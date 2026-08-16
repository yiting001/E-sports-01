import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CONFIG_KEYS, SmsRegisterPayload, TokenPair } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { SmsCodeService } from '../../../sms/application/sms-code.service';
import { SmsCodePurpose } from '../../../sms/domain/sms-code-scope';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { PhoneMemberRegistrar } from '../phone-member-registrar.service';
import { TenantResolver } from '../tenant-resolver.service';
import { TokenService } from '../token.service';

/**
 * 用例：短信验证码注册（配置中心开关控制）。
 * 校验并消费验证码后，通过 PhoneMemberRegistrar 创建 member 账号并直接签发令牌。
 * 说明：C 端已改为登录注册合一（短信登录首登自动注册），本路由保留兼容旧客户端。
 */
@Injectable()
export class SmsRegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly config: ConfigService,
    private readonly smsCode: SmsCodeService,
    private readonly registrar: PhoneMemberRegistrar,
    private readonly token: TokenService,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(payload: SmsRegisterPayload): Promise<TokenPair> {
    if (!(await this.config.getBoolean(CONFIG_KEYS.auth.smsLoginEnabled, true))) {
      throw new ForbiddenException('手机号验证码注册未开启');
    }
    const tenantId = await this.tenants.resolveForWrite(payload.tenantCode);
    const valid = await this.smsCode.verify(payload.phone, payload.code, {
      purpose: SmsCodePurpose.Register,
      tenantId,
    });
    if (!valid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    if (await this.userRepo.existsByPhone(payload.phone, undefined, tenantId)) {
      throw new ConflictException('该手机号已注册，请直接登录');
    }
    const saved = await this.registrar.register(payload.phone, tenantId, payload.nickname);
    return this.token.issueTokenPair(saved.id, saved.username, saved.tenantId);
  }
}
