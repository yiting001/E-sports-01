import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** 为用户分配角色入参：一个用户至多绑定一个角色 */
export class AssignRolesDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(1)
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
