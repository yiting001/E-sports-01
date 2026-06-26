import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, UploadedFileView } from '@app/contracts';
import { ListFilesUseCase } from '../../application/use-cases/list-files.usecase';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：分页查询已上传文件列表 */
@Controller('upload/files')
export class FileListController {
  constructor(private readonly useCase: ListFilesUseCase) {}

  @Get()
  @Permissions(PERMS.file.list)
  list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<UploadedFileView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip);
  }
}
