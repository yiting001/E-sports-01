import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SmsLoginPayload, TokenPair } from '@app/contracts';
import { SmsCodeService } from '../../../sms/application/sms-code.service';
import { SmsCodePurpose } from '../../../sms/domain/sms-code-scope';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { UserStatus } from '../../domain/user.entity';
import { TenantResolver } from '../tenant-resolver.service';
import { TokenService } from '../token.service';

/**
 * 用例：短信验证码登录。
 * 先解析启用账号及其租户作用域，再校验并消费验证码并签发令牌；账号不存在不自动注册。
 */
@Injectable()
export class SmsLoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly smsCode: SmsCodeService,
    private readonly token: TokenService,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(payload: SmsLoginPayload): Promise<TokenPair> {
    const tenantId = await this.tenants.resolveOptionalId(payload.tenantCode);
    const user = await this.userRepo.findByPhone(payload.phone, tenantId);
    if (!user || user.status !== UserStatus.Enabled) {
      throw new UnauthorizedException('该手机号未绑定可用账号');
    }
    await this.tenants.assertTenantEnabled(user.tenantId);
    const valid = await this.smsCode.verify(payload.phone, payload.code, {
      purpose: SmsCodePurpose.Login,
      tenantId: user.tenantId,
    });
    if (!valid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    return this.token.issueTokenPair(user.id, user.username, user.tenantId);
  }
}
