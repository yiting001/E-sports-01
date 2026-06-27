import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Not, Repository } from 'typeorm';
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

  findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { id: In(ids) } });
  }

  findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.username = :username', { username })
      .getOne();
  }

  findByAccountWithPassword(account: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.username = :account', { account })
      .orWhere('user.phone = :phone', { phone: account })
      .getOne();
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.repo.findOne({ where: { phone }, relations: { roles: true } });
  }

  async existsByUsername(username: string): Promise<boolean> {
    return (await this.repo.countBy({ username })) > 0;
  }

  async existsByPhone(phone: string, excludeUserId?: string): Promise<boolean> {
    const count = await this.repo.countBy(
      excludeUserId ? { phone, id: Not(excludeUserId) } : { phone },
    );
    return count > 0;
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
