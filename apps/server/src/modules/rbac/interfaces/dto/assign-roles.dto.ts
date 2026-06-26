import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** 为用户分配角色入参 */
export class AssignRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
