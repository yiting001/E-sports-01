import { Controller, Get, Query } from '@nestjs/common';
import { ConfigItemView } from '@app/contracts';
import { PERMS } from '../../rbac/domain/permission-codes';
import { Permissions } from '../../rbac/interfaces/auth/permissions.decorator';
import { ListConfigsUseCase } from '../application/use-cases/list-configs.usecase';

/** 路由：查询配置列表（可选按分组过滤） */
@Controller('config')
export class ListConfigsController {
  constructor(private readonly useCase: ListConfigsUseCase) {}

  @Get()
  @Permissions(PERMS.config.list)
  list(@Query('group') group?: string): Promise<ConfigItemView[]> {
    return this.useCase.execute(group);
  }
}
