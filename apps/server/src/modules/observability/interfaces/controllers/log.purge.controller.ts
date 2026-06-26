import { Body, Controller, Delete } from '@nestjs/common';
import { PERMS } from '@app/contracts';
import {
  PurgeLogsUseCase,
  PurgeResult,
} from '../../application/use-cases/purge-logs.usecase';
import { PurgeLogsDto } from '../dto/purge-logs.dto';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：按保留天数清理过期日志 */
@Controller('observability/logs')
export class LogPurgeController {
  constructor(private readonly useCase: PurgeLogsUseCase) {}

  @Delete()
  @Permissions(PERMS.log.purge)
  purge(@Body() body: PurgeLogsDto): Promise<PurgeResult> {
    return this.useCase.execute(body.days);
  }
}
