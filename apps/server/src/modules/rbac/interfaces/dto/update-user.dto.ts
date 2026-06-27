import {
  IsEnum,
  IsOptional,
  IsString,
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
}
