import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user-repository.interface';

/** 用户仓储 TypeORM 实现 */
@Injectable()
export class TypeormUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id }, relations: { roles: true } });
  }

  findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.username = :username', { username })
      .getOne();
  }

  async existsByUsername(username: string): Promise<boolean> {
    return (await this.repo.countBy({ username })) > 0;
  }

  paginate(skip: number, take: number, keyword?: string): Promise<[User[], number]> {
    return this.repo.findAndCount({
      where: keyword ? [{ username: ILike(`%${keyword}%`) }, { nickname: ILike(`%${keyword}%`) }] : {},
      relations: { roles: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
