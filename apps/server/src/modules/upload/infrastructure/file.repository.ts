import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadedFileEntity } from '../domain/uploaded-file.entity';
import { FileRepository } from '../domain/file-repository.interface';

/** 文件元数据仓储的 TypeORM 实现 */
@Injectable()
export class TypeormFileRepository implements FileRepository {
  constructor(
    @InjectRepository(UploadedFileEntity)
    private readonly repo: Repository<UploadedFileEntity>,
  ) {}

  save(file: UploadedFileEntity): Promise<UploadedFileEntity> {
    return this.repo.save(file);
  }

  findById(id: string): Promise<UploadedFileEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  paginate(
    skip: number,
    take: number,
  ): Promise<[UploadedFileEntity[], number]> {
    return this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
