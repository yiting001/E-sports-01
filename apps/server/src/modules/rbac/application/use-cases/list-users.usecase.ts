import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, UserView } from '@app/contracts';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { toUserView } from '../user.mapper';

/** 用例：分页查询用户列表 */
@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: UserRepository) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<UserView>> {
    const [rows, total] = await this.userRepo.paginate(skip, pageSize, keyword);
    return { list: rows.map(toUserView), total, page, pageSize };
  }
}
