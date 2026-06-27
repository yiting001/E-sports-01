import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TenantStatus, UpdateTenantPayload } from '@app/contracts';

/** 更新租户入参（编码不可改） */
export class UpdateTenantDto implements UpdateTenantPayload {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  name?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}
