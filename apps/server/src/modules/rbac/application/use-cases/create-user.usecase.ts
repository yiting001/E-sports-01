import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { UserView } from '@app/contracts';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { UserStatus } from '../../domain/user.entity';
import { PasswordService } from '../../infrastructure/password.service';
import { toUserView } from '../user.mapper';

/** 创建用户入参 */
export interface CreateUserInput {
  username: string;
  password: string;
  nickname?: string;
  status?: UserStatus;
  roleIds?: string[];
}

/** 用例：管理员创建用户（可同时分配角色） */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    private readonly password: PasswordService,
  ) {}

  async execute(input: CreateUserInput): Promise<UserView> {
    if (await this.userRepo.existsByUsername(input.username)) {
      throw new ConflictException('用户名已存在');
    }
    const roles = input.roleIds?.length ? await this.roleRepo.findByIds(input.roleIds) : [];
    const entity = this.userRepo.create({
      username: input.username,
      passwordHash: await this.password.hash(input.password),
      nickname: input.nickname ?? input.username,
      status: input.status ?? UserStatus.Enabled,
      roles,
    });
    return toUserView(await this.userRepo.save(entity));
  }
}
