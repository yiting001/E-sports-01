import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { UploadedFileEntity } from '../domain/uploaded-file.entity';
import { FileRepository } from '../domain/file-repository.interface';

/** 文件元数据仓储的 TypeORM 实现。读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormFileRepository implements FileRepository {
  constructor(
    @InjectRepository(UploadedFileEntity)
    private readonly repo: Repository<UploadedFileEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  save(file: UploadedFileEntity): Promise<UploadedFileEntity> {
    return this.repo.save(file);
  }

  findById(id: string): Promise<UploadedFileEntity | null> {
    return this.repo.findOne({
      where: withTenant<UploadedFileEntity>(this.tenant, { id }) as FindOptionsWhere<UploadedFileEntity>,
    });
  }

  paginate(skip: number, take: number): Promise<[UploadedFileEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<UploadedFileEntity>(this.tenant, {}),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(
      withTenant<UploadedFileEntity>(this.tenant, { id }) as FindOptionsWhere<UploadedFileEntity>,
    );
  }
}
