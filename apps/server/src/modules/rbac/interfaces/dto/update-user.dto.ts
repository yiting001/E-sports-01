import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { CHINA_MOBILE_PATTERN } from '@app/contracts';
import { UserStatus } from '../../domain/user.entity';
import { UpdateUserInput } from '../../application/use-cases/update-user.usecase';

/** 更新用户入参 */
export class UpdateUserDto implements UpdateUserInput {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  nickname?: string;

  /** 传空串可解绑手机号；传非空须为合法手机号 */
  @ValidateIf((o: UpdateUserDto) => o.phone !== undefined && o.phone !== '')
  @Matches(CHINA_MOBILE_PATTERN, { message: '手机号格式不正确' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @Length(6, 128)
  password?: string;

  /** 目标所属租户主键；仅平台超管可变更，变更后自动解绑原租户角色 */
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;
}
