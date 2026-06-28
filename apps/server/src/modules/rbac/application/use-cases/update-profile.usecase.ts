import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateProfilePayload, UserView } from '@app/contracts';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { toUserView } from '../user.mapper';

/**
 * 用例：当前登录用户自助更新本人资料。
 * 仅允许改 昵称/头像/手机号；用户名、状态、角色、口令不在此处变更。
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

  async execute(userId: string, input: UpdateProfilePayload): Promise<UserView> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (input.nickname !== undefined) {
      user.nickname = input.nickname;
    }
    if (input.avatar !== undefined) {
      user.avatar = input.avatar;
    }
    if (input.phone !== undefined) {
      if (input.phone && (await this.userRepo.existsByPhone(input.phone, userId))) {
        throw new ConflictException('手机号已被其他用户绑定');
      }
      user.phone = input.phone;
    }
    return toUserView(await this.userRepo.save(user));
  }
}
