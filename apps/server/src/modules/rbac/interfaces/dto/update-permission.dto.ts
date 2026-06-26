import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { UpdatePermissionInput } from '../../application/use-cases/update-permission.usecase';

/** 更新权限入参 */
export class UpdatePermissionDto implements UpdatePermissionInput {
  @IsOptional()
  @IsUUID('4')
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 191)
  path?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 191)
  component?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 16)
  apiMethod?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 191)
  apiPath?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  icon?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
