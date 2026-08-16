import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CONFIG_KEYS, SmsLoginPayload, SmsLoginResult } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { SmsCodeService } from '../../../sms/application/sms-code.service';
import { SmsCodePurpose } from '../../../sms/domain/sms-code-scope';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { UserStatus } from '../../domain/user.entity';
import { PhoneMemberRegistrar } from '../phone-member-registrar.service';
import { TenantResolver } from '../tenant-resolver.service';
import { TokenService } from '../token.service';

/**
 * 用例：短信验证码登录（配置中心开关控制）。
 * 登录注册合一：校验并消费验证码后，手机号已有启用账号则直接登录，
 * 未注册则自动注册 member（普通用户）账号并登录，返回 registered 标记首登。
 */
@Injectable()
export class SmsLoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly config: ConfigService,
    private readonly smsCode: SmsCodeService,
    private readonly token: TokenService,
    private readonly tenants: TenantResolver,
    private readonly registrar: PhoneMemberRegistrar,
  ) {}

  async execute(payload: SmsLoginPayload): Promise<SmsLoginResult> {
    if (!(await this.config.getBoolean(CONFIG_KEYS.auth.smsLoginEnabled, true))) {
      throw new ForbiddenException('手机号验证码登录未开启');
    }
    const lookupTenantId = await this.tenants.resolveOptionalId(payload.tenantCode);
    const existing = await this.userRepo.findByPhone(payload.phone, lookupTenantId);
    if (existing && existing.status !== UserStatus.Enabled) {
      throw new UnauthorizedException('该手机号绑定的账号已被禁用');
    }
    const tenantId = existing
      ? existing.tenantId
      : await this.tenants.resolveForWrite(payload.tenantCode);
    await this.tenants.assertTenantEnabled(tenantId);
    const valid = await this.smsCode.verify(payload.phone, payload.code, {
      purpose: SmsCodePurpose.Login,
      tenantId,
    });
    if (!valid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    const user = existing ?? (await this.registrar.register(payload.phone, tenantId));
    const tokens = await this.token.issueTokenPair(user.id, user.username, user.tenantId);
    return { ...tokens, registered: !existing };
  }
}
