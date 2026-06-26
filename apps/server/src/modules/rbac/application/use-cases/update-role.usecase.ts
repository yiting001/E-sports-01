import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import { toRoleView } from '../role.mapper';

/** 更新角色入参 */
export interface UpdateRoleInput {
  name?: string;
  remark?: string;
}

/** 用例：更新角色基础信息 */
@Injectable()
export class UpdateRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository) {}

  async execute(id: string, input: UpdateRoleInput): Promise<RoleView> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (input.name !== undefined) {
      role.name = input.name;
    }
    if (input.remark !== undefined) {
      role.remark = input.remark;
    }
    return toRoleView(await this.roleRepo.save(role));
  }
}
