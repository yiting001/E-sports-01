import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenPair } from '@app/contracts';
import { UserStatus } from '../../domain/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { TokenService } from '../token.service';
import { TenantResolver } from '../tenant-resolver.service';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';

/** 用例：用刷新令牌换取新的令牌对 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: Pick<UserRepository, 'findById'>,
    @Inject(TokenService)
    private readonly token: Pick<TokenService, 'verifyRefresh' | 'issueTokenPair'>,
    private readonly tenants: TenantResolver,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(refreshToken: string): Promise<TokenPair> {
    const payload = await this.token.verifyRefresh(refreshToken).catch(() => {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    });
    const user = await this.userRepo.findById(payload.sub);
    if (
      payload.type !== 'refresh' ||
      !user ||
      user.status !== UserStatus.Enabled ||
      payload.tenantId !== user.tenantId ||
      this.tenant.tenantId !== user.tenantId
    ) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    await this.tenants.assertTenantEnabled(user.tenantId);
    return this.token.issueTokenPair(user.id, user.username, user.tenantId);
  }
}
