import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { RemoveTenantUseCase } from '../../application/use-cases/remove-tenant.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';

/** 路由：删除租户（仅平台超管） */
@Controller('rbac/tenants')
export class TenantRemoveController {
  constructor(private readonly useCase: RemoveTenantUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(PERMS.tenant.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
