import { Body, Controller, Post } from '@nestjs/common';
import { ConfigItemView } from '@app/contracts';
import { PERMS } from '../../rbac/domain/permission-codes';
import { Permissions } from '../../rbac/interfaces/auth/permissions.decorator';
import { UpsertConfigUseCase } from '../application/use-cases/upsert-config.usecase';
import { UpsertConfigDto } from './dto/upsert-config.dto';

/** 路由：新增或更新配置项 */
@Controller('config')
export class UpsertConfigController {
  constructor(private readonly useCase: UpsertConfigUseCase) {}

  @Post()
  @Permissions(PERMS.config.save)
  upsert(@Body() dto: UpsertConfigDto): Promise<ConfigItemView> {
    return this.useCase.execute(dto);
  }
}
