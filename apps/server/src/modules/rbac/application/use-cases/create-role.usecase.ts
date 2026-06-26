import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import { toRoleView } from '../role.mapper';

/** 创建角色入参 */
export interface CreateRoleInput {
  code: string;
  name: string;
  remark?: string;
}

/** 用例：创建角色 */
@Injectable()
export class CreateRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository) {}

  async execute(input: CreateRoleInput): Promise<RoleView> {
    if (await this.roleRepo.existsByCode(input.code)) {
      throw new ConflictException('角色编码已存在');
    }
    const entity = this.roleRepo.create({
      code: input.code,
      name: input.name,
      remark: input.remark ?? '',
    });
    return toRoleView(await this.roleRepo.save(entity));
  }
}
