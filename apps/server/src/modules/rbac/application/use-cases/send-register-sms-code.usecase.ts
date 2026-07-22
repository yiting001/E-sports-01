import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { SendSmsCodeResult } from '@app/contracts';
import { SmsCodeService } from '../../../sms/application/sms-code.service';
import { SmsCodePurpose } from '../../../sms/domain/sms-code-scope';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { TenantResolver } from '../tenant-resolver.service';

/**
 * 用例：发送注册短信验证码。
 * 与登录发码相反——仅向「尚未绑定任何账号」的手机号发送；已注册则拒绝，引导去登录，
 * 避免重复注册与向已注册号码发送无意义验证码。
 */
@Injectable()
export class SendRegisterSmsCodeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly smsCode: SmsCodeService,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(phone: string, tenantCode?: string): Promise<SendSmsCodeResult> {
    const tenantId = await this.tenants.resolveForWrite(tenantCode);
    if (await this.userRepo.existsByPhone(phone, undefined, tenantId)) {
      throw new ConflictException('该手机号已注册，请直接登录');
    }
    const cooldown = await this.smsCode.send(phone, {
      purpose: SmsCodePurpose.Register,
      tenantId,
    });
    return { cooldown };
  }
}
