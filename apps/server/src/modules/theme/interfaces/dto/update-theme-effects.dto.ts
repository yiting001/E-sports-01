import { IsArray, IsEnum } from 'class-validator';
import { ThemeEffect } from '@app/contracts';

/** 更新主题特效配置入参：整量覆盖，空数组表示全部关闭 */
export class UpdateThemeEffectsDto {
  @IsArray()
  @IsEnum(ThemeEffect, { each: true })
  effects!: ThemeEffect[];
}
