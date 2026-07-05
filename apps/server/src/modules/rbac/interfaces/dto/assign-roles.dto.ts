import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { USER_ROLES_MAX } from '@app/contracts';

/** 为用户分配角色入参：支持一个用户绑定多个角色 */
export class AssignRolesDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(USER_ROLES_MAX)
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
