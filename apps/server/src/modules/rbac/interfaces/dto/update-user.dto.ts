import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserStatus } from '../../domain/user.entity';
import { UpdateUserInput } from '../../application/use-cases/update-user.usecase';

/** 更新用户入参 */
export class UpdateUserDto implements UpdateUserInput {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  nickname?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @Length(6, 128)
  password?: string;
}
