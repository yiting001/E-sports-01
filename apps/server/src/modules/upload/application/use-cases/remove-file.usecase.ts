import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FILE_REPOSITORY,
  FileRepository,
} from '../../domain/file-repository.interface';
import { StorageResolver } from '../storage.resolver';

/**
 * 用例：删除文件。
 * 先删存储对象（复用文件记录中的原始驱动），再删元数据，保证两端一致。
 */
@Injectable()
export class RemoveFileUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly fileRepo: FileRepository,
    private readonly storage: StorageResolver,
  ) {}

  async execute(id: string): Promise<void> {
    const file = await this.fileRepo.findById(id);
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    const port = this.storage.pickByDriver(file.driver);
    await port.remove(file.key);
    await this.fileRepo.remove(id);
  }
}
