import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { RegisterPayload, TokenPair } from '@app/contracts';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { PasswordService } from '../../infrastructure/password.service';
import { TokenService } from '../token.service';

/** 用例：用户注册并直接签发令牌 */
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly password: PasswordService,
    private readonly token: TokenService,
  ) {}

  async execute(payload: RegisterPayload): Promise<TokenPair> {
    if (await this.userRepo.existsByUsername(payload.username)) {
      throw new ConflictException('用户名已存在');
    }
    const phone = payload.phone ?? '';
    if (phone && (await this.userRepo.existsByPhone(phone))) {
      throw new ConflictException('手机号已被其他用户绑定');
    }
    const passwordHash = await this.password.hash(payload.password);
    const entity = this.userRepo.create({
      username: payload.username,
      passwordHash,
      nickname: payload.nickname ?? payload.username,
      phone,
    });
    const saved = await this.userRepo.save(entity);
    return this.token.issueTokenPair(saved.id, saved.username);
  }
}
