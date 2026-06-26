import { PermissionType } from '@app/contracts';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { CreatePermissionInput } from '../../application/use-cases/create-permission.usecase';

/** 新建权限入参 */
export class CreatePermissionDto implements CreatePermissionInput {
  @IsOptional()
  @IsUUID('4')
  parentId?: string | null;

  @IsString()
  @Length(1, 128)
  code!: string;

  @IsString()
  @Length(1, 64)
  name!: string;

  @IsEnum(PermissionType)
  type!: PermissionType;

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
