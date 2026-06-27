import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { CreateTenantPayload } from '@app/contracts';

/** 租户编码：小写字母/数字/连字符，便于作登录标识 */
const TENANT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

/** 新建租户入参 */
export class CreateTenantDto implements CreateTenantPayload {
  @Matches(TENANT_CODE_PATTERN, {
    message: '租户编码须为 3-64 位小写字母、数字或连字符',
  })
  code!: string;

  @IsString()
  @Length(1, 64)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  adminUsername?: string;

  @IsOptional()
  @IsString()
  @Length(6, 128)
  adminPassword?: string;
}
