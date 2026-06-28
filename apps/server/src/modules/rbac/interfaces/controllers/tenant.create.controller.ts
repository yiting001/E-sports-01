import { Body, Controller, Post } from '@nestjs/common';
import { TenantView } from '@app/contracts';
import { CreateTenantUseCase } from '../../application/use-cases/create-tenant.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { CreateTenantDto } from '../dto/create-tenant.dto';

/** 路由：新建租户（仅平台超管） */
@Controller('rbac/tenants')
export class TenantCreateController {
  constructor(private readonly useCase: CreateTenantUseCase) {}

  @Post()
  @Permissions(PERMS.tenant.create)
  create(@Body() dto: CreateTenantDto): Promise<TenantView> {
    return this.useCase.execute(dto);
  }
}
