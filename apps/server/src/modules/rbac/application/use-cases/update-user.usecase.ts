import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserView } from '@app/contracts';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { UserStatus } from '../../domain/user.entity';
import { PasswordService } from '../../infrastructure/password.service';
import { toUserView } from '../user.mapper';

/** 更新用户入参（均为可选，按需更新） */
export interface UpdateUserInput {
  nickname?: string;
  status?: UserStatus;
  password?: string;
}

/** 用例：更新用户基础信息/状态/口令 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly password: PasswordService,
  ) {}

  async execute(id: string, input: UpdateUserInput): Promise<UserView> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (input.nickname !== undefined) {
      user.nickname = input.nickname;
    }
    if (input.status !== undefined) {
      user.status = input.status;
    }
    if (input.password) {
      user.passwordHash = await this.password.hash(input.password);
    }
    return toUserView(await this.userRepo.save(user));
  }
}
