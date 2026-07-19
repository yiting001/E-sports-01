import {
  BoosterPublicView,
  PaginatedResult,
} from '@app/contracts';
import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ListBoosterDirectoryUseCase } from '../../application/use-cases/list-booster-directory.usecase';
import { BoosterDirectoryQueryDto } from '../dto/booster-directory-query.dto';

/** 登录用户按当前租户浏览审核通过且仍可用的打手目录。 */
@Controller('booster')
export class BoosterDirectoryListController {
  constructor(private readonly useCase: ListBoosterDirectoryUseCase) {}

  @Get('directory')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: BoosterDirectoryQueryDto,
  ): Promise<PaginatedResult<BoosterPublicView>> {
    return this.useCase.execute(user.id, query.page, query.pageSize, query.skip, {
      keyword: query.keyword,
      gender: query.gender,
      serviceRegion: query.serviceRegion,
    });
  }
}
