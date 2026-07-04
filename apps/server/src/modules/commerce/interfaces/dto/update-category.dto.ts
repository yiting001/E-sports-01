import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { UpdateCategoryPayload } from '@app/contracts';

/** 更新分类入参（按需部分更新） */
export class UpdateCategoryDto implements UpdateCategoryPayload {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  cover?: string;

  @IsOptional()
  @IsString()
  @Length(0, 512)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
