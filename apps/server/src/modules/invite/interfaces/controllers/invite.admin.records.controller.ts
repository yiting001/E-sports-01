import { Controller, Get, Query } from '@nestjs/common';
import { InviteRecordAdminView, PERMS, PaginatedResult } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { ListInviteRecordsUseCase } from '../../application/use-cases/list-invite-records.usecase';

/** 路由：管理端分页查询邀请记录（GET /invite/admin/records）；需 invite:record:list 权限 */
@Controller('invite')
export class InviteAdminRecordsController {
  constructor(private readonly useCase: ListInviteRecordsUseCase) {}

  @Get('admin/records')
  @Permissions(PERMS.invite.recordList)
  list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<InviteRecordAdminView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip);
  }
}
