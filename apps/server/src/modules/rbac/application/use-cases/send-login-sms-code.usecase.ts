import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CONFIG_KEYS, SendSmsCodeResult } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { SmsCodeService } from '../../../sms/application/sms-code.service';
import { SmsCodePurpose } from '../../../sms/domain/sms-code-scope';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { UserStatus } from '../../domain/user.entity';
import { TenantResolver } from '../tenant-resolver.service';

/**
 * 用例：发送登录短信验证码（配置中心开关控制）。
 * 仅向「已绑定该手机号且启用中的账号」发送，不存在则拒绝（不自动注册），
 * 避免向无关号码发送短信、控制成本与滥用。
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
    const tenantId = await this.tenants.resolveOptionalId(tenantCode);
    const user = await this.userRepo.findByPhone(phone, tenantId);
    if (!user || user.status !== UserStatus.Enabled) {
      throw new BadRequestException('该手机号未绑定可用账号');
    }
    const cooldown = await this.smsCode.send(phone, {
      purpose: SmsCodePurpose.Login,
      tenantId: user.tenantId,
    });
    return { cooldown };
  }
}
