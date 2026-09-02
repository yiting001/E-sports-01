import type { RoleKind, RoleListQuery } from '@app/contracts';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

const ROLE_KINDS: readonly RoleKind[] = ['builtin', 'custom'];

/** 角色列表查询入参 */
export class ListRolesQueryDto extends PaginationQueryDto implements RoleListQuery {
  /** 名称/编码模糊搜索 */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  /** 角色编码精确筛选 */
  @IsOptional()
  @IsString()
  @Length(1, 64)
  code?: string;

  /** 内置/自定义分类筛选 */
  @IsOptional()
  @IsIn([...ROLE_KINDS])
  kind?: RoleKind;
}
