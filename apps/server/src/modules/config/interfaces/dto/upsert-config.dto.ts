import { ConfigGroup, ConfigValueType } from '@app/contracts';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';

/** 新增/更新配置项入参 */
export class UpsertConfigDto {
  @IsString()
  @Length(1, 128)
  key!: string;

  @IsString()
  value!: string;

  @IsEnum(ConfigValueType)
  type!: ConfigValueType;

  @IsEnum(ConfigGroup)
  group!: ConfigGroup;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;

  @IsOptional()
  @IsBoolean()
  secret?: boolean;
}
