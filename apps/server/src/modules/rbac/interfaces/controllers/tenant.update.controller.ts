import { Body, Controller, Param, Patch } from '@nestjs/common';
import { TenantView } from '@app/contracts';
import { UpdateTenantUseCase } from '../../application/use-cases/update-tenant.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { UpdateTenantDto } from '../dto/update-tenant.dto';

/** 路由：更新租户（仅平台超管） */
@Controller('rbac/tenants')
export class TenantUpdateController {
  constructor(private readonly useCase: UpdateTenantUseCase) {}

  @Patch(':id')
  @Permissions(PERMS.tenant.update)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantView> {
    return this.useCase.execute(id, dto);
  }
}
