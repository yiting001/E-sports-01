import { Controller, Get } from '@nestjs/common';
import { ServiceQueueItemView } from '@app/contracts';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { GetServiceQueueUseCase } from '../../application/use-cases/get-service-queue.usecase';

/** 路由：客服待接入队列（坐席视角） */
@Controller('im/service')
export class ServiceQueueController {
  constructor(private readonly useCase: GetServiceQueueUseCase) {}

  @Get('queue')
  @Permissions(PERMS.im.serviceAgent)
  queue(): Promise<ServiceQueueItemView[]> {
    return this.useCase.execute();
  }
}
