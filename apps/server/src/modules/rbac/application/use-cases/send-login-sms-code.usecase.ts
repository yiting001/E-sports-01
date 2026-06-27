import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SendSmsCodeResult } from '@app/contracts';
import { SmsCodeService } from '../../../sms/application/sms-code.service';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { UserStatus } from '../../domain/user.entity';

/**
 * 用例：发送登录短信验证码。
 * 仅向「已绑定该手机号且启用中的账号」发送，不存在则拒绝（不自动注册），
 * 避免向无关号码发送短信、控制成本与滥用。
 */
@Injectable()
export class SendLoginSmsCodeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly smsCode: SmsCodeService,
  ) {}

  async execute(phone: string): Promise<SendSmsCodeResult> {
    const user = await this.userRepo.findByPhone(phone);
    if (!user || user.status !== UserStatus.Enabled) {
      throw new BadRequestException('该手机号未绑定可用账号');
    }
    const cooldown = await this.smsCode.send(phone);
    return { cooldown };
  }
}
