import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Role } from '../domain/role.entity';
import { RoleRepository } from '../domain/role-repository.interface';

/** 角色仓储 TypeORM 实现 */
@Injectable()
export class TypeormRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {}

  findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id }, relations: { permissions: true } });
  }

  findByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { id: In(ids) }, relations: { permissions: true } });
  }

  findByCode(code: string): Promise<Role | null> {
    return this.repo.findOne({ where: { code }, relations: { permissions: true } });
  }

  async existsByCode(code: string): Promise<boolean> {
    return (await this.repo.countBy({ code })) > 0;
  }

  paginate(skip: number, take: number, keyword?: string): Promise<[Role[], number]> {
    return this.repo.findAndCount({
      where: keyword ? [{ name: ILike(`%${keyword}%`) }, { code: ILike(`%${keyword}%`) }] : {},
      relations: { permissions: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<Role>): Role {
    return this.repo.create(data);
  }

  save(role: Role): Promise<Role> {
    return this.repo.save(role);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
