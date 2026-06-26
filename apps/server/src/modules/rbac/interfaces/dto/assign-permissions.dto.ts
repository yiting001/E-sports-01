import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** 为角色分配权限入参 */
export class AssignPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}
