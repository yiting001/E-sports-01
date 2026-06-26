import { IsOptional, IsString, Length } from 'class-validator';
import { UpdateRoleInput } from '../../application/use-cases/update-role.usecase';

/** 更新角色入参 */
export class UpdateRoleDto implements UpdateRoleInput {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}
