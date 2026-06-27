import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginPayload, TokenPair } from '@app/contracts';
import { UserStatus } from '../../domain/user.entity';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { PasswordService } from '../../infrastructure/password.service';
import { TenantResolver } from '../tenant-resolver.service';
import { TokenService } from '../token.service';

/** 用例：用户登录，校验口令与状态后签发令牌 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly password: PasswordService,
    private readonly token: TokenService,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(payload: LoginPayload): Promise<TokenPair> {
    const tenantId = await this.tenants.resolveOptionalId(payload.tenantCode);
    const user = await this.userRepo.findByAccountWithPassword(payload.account, tenantId);
    if (!user || !(await this.password.compare(payload.password, user.passwordHash))) {
      throw new UnauthorizedException('账号或密码错误');
    }
    if (user.status !== UserStatus.Enabled) {
      throw new UnauthorizedException('账号已被禁用');
    }
    await this.tenants.assertTenantEnabled(user.tenantId);
    return this.token.issueTokenPair(user.id, user.username, user.tenantId);
  }
}
