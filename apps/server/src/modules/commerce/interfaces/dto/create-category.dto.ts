import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { CreateCategoryPayload } from '@app/contracts';

/** 创建分类入参 */
export class CreateCategoryDto implements CreateCategoryPayload {
  @IsString()
  @Length(1, 64)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  cover?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
