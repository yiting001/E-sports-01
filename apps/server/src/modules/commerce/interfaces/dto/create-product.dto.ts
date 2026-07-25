import { IsInt, IsOptional, IsString, IsUUID, Length, Min, ValidateIf } from 'class-validator';
import { CreateProductPayload } from '@app/contracts';

/** 创建商品入参 */
export class CreateProductDto implements CreateProductPayload {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @Length(1, 128)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 512)
  cover?: string;

  @IsString()
  @Length(1, 128)
  coverTitle!: string;

  @IsOptional()
  @IsString()
  @Length(0, 128)
  coverSub?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20000)
  description?: string;

  @IsInt()
  @Min(0)
  priceFen!: number;

  @IsInt()
  @Min(0)
  originPriceFen!: number;

  @IsInt()
  @Min(0)
  pcPriceFen!: number;

  @IsInt()
  @Min(0)
  pcOriginPriceFen!: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUUID()
  serviceAgentId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
