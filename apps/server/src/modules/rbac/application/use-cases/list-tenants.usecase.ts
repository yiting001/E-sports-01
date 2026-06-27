import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, TenantView } from '@app/contracts';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../../domain/tenant-repository.interface';
import { toTenantView } from '../tenant.mapper';

/** 用例：分页查询租户列表（仅平台超管可见） */
@Injectable()
export class ListTenantsUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: TenantRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<TenantView>> {
    const [rows, total] = await this.tenantRepo.paginate(skip, pageSize, keyword);
    return { list: rows.map(toTenantView), total, page, pageSize };
  }
}
