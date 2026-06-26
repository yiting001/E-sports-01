import { IsOptional, IsString, Length } from 'class-validator';
import { CreateRoleInput } from '../../application/use-cases/create-role.usecase';

/** 新建角色入参 */
export class CreateRoleDto implements CreateRoleInput {
  @IsString()
  @Length(1, 64)
  code!: string;

  @IsString()
  @Length(1, 64)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}
