import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, UploadedFileView } from '@app/contracts';
import {
  FILE_REPOSITORY,
  FileRepository,
} from '../../domain/file-repository.interface';
import { toUploadedFileView } from '../file.mapper';

/** 用例：分页查询文件列表 */
@Injectable()
export class ListFilesUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly fileRepo: FileRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<UploadedFileView>> {
    const [rows, total] = await this.fileRepo.paginate(skip, pageSize);
    return { list: rows.map(toUploadedFileView), total, page, pageSize };
  }
}
