import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { UserStatus } from '../../domain/user.entity';
import { CreateUserInput } from '../../application/use-cases/create-user.usecase';

/** 新建用户入参 */
export class CreateUserDto implements CreateUserInput {
  @IsString()
  @Length(1, 64)
  username!: string;

  @IsString()
  @Length(6, 128)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  nickname?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}
