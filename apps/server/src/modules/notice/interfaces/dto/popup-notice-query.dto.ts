import { IsOptional, IsString, MaxLength } from 'class-validator';

/** C 端弹窗公告查询入参：选填租户编码，缺省按内置默认租户 */
export class PopupNoticeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantCode?: string;
}
