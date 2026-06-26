import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';

/** 用例：删除用户并清理其鉴权缓存 */
@Injectable()
export class RemoveUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly resolver: PermissionResolver,
  ) {}

  async execute(id: string): Promise<void> {
    await this.userRepo.remove(id);
    await this.resolver.invalidate(id);
  }
}
