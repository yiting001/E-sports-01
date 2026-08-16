import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CONFIG_KEYS, SendSmsCodeResult } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { SmsCodeService } from '../../../sms/application/sms-code.service';
import { SmsCodePurpose } from '../../../sms/domain/sms-code-scope';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { UserStatus } from '../../domain/user.entity';
import { TenantResolver } from '../tenant-resolver.service';

/**
 * 用例：发送登录短信验证码（配置中心开关控制）。
 * 登录注册合一：未注册手机号也可发码（首登自动注册）；
 * 已绑定但被禁用的账号拒绝发码，避免向无法登录的号码浪费短信。
 */
@Injectable()
export class SendLoginSmsCodeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly config: ConfigService,
    private readonly smsCode: SmsCodeService,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(phone: string, tenantCode?: string): Promise<SendSmsCodeResult> {
    if (!(await this.config.getBoolean(CONFIG_KEYS.auth.smsLoginEnabled, true))) {
      throw new ForbiddenException('手机号验证码登录未开启');
    }
    const lookupTenantId = await this.tenants.resolveOptionalId(tenantCode);
    const user = await this.userRepo.findByPhone(phone, lookupTenantId);
    if (user && user.status !== UserStatus.Enabled) {
      throw new UnauthorizedException('该手机号绑定的账号已被禁用');
    }
    const tenantId = user ? user.tenantId : await this.tenants.resolveForWrite(tenantCode);
    const cooldown = await this.smsCode.send(phone, {
      purpose: SmsCodePurpose.Login,
      tenantId,
    });
    return { cooldown };
  }
}
