import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { UpdateProductPayload } from '@app/contracts';

/** 更新商品入参（按需部分更新） */
export class UpdateProductDto implements UpdateProductPayload {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 512)
  cover?: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  coverTitle?: string;

  @IsOptional()
  @IsString()
  @Length(0, 128)
  coverSub?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceFen?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  originPriceFen?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUUID()
  serviceAgentId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sold?: number;
}
