import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserView } from '@app/contracts';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { PasswordService } from '../../infrastructure/password.service';
import { PermissionResolver } from '../permission-resolver.service';
import { toUserView } from '../user.mapper';

/** 用例：管理员重置用户登录密码 */
@Injectable()
export class ResetUserPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly password: PasswordService,
    private readonly permissions: PermissionResolver,
  ) {}

  async execute(id: string, plainPassword: string): Promise<UserView> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    user.passwordHash = await this.password.hash(plainPassword);
    const saved = await this.userRepo.save(user);
    await this.permissions.invalidate(id);
    return toUserView(saved);
  }
}
