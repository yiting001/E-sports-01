import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenPair } from '@app/contracts';
import { UserStatus } from '../../domain/user.entity';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { TokenService } from '../token.service';

/** 用例：用刷新令牌换取新的令牌对 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly token: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<TokenPair> {
    const payload = await this.token.verifyRefresh(refreshToken).catch(() => {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    });
    const user = await this.userRepo.findById(payload.sub);
    if (!user || user.status !== UserStatus.Enabled) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    return this.token.issueTokenPair(user.id, user.username);
  }
}
