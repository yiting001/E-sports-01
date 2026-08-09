import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { UserStatus } from '../../domain/user.entity';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 用户列表查询入参 */
export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsUUID()
  roleId?: string;
}
