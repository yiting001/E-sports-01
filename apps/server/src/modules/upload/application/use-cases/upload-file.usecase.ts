import {
  Inject,
  Injectable,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import { CONFIG_KEYS, UploadedFile } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  FILE_REPOSITORY,
  FileRepository,
} from '../../domain/file-repository.interface';
import { UploadedFileEntity } from '../../domain/uploaded-file.entity';
import { buildObjectKey } from '../../domain/object-key';
import { StorageResolver } from '../storage.resolver';
import { toUploadedFile } from '../file.mapper';

/** 上传单个文件的输入（来自 multer 内存存储） */
export interface UploadFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

/** 默认单文件上限（MB，仅在配置缺失时兜底，正常以配置中心为准） */
const FALLBACK_MAX_SIZE_MB = 10;

/** MB 与字节换算系数（配置以 MB 计，校验按字节比较） */
const BYTES_PER_MB = 1024 * 1024;

/**
 * 用例：上传文件。
 * 流程：校验大小 → 生成 key → 交当前生效存储驱动落地 → 持久化元数据。
 */
@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly fileRepo: FileRepository,
    private readonly storage: StorageResolver,
    private readonly config: ConfigService,
  ) {}

  async execute(input: UploadFileInput, uploaderId: string): Promise<UploadedFile> {
    if (!input || !input.buffer || input.size <= 0) {
      throw new BadRequestException('未接收到有效文件');
    }
    const maxSizeMb = await this.config.getNumber(
      CONFIG_KEYS.upload.maxFileSize,
      FALLBACK_MAX_SIZE_MB,
    );
    if (input.size > maxSizeMb * BYTES_PER_MB) {
      throw new PayloadTooLargeException(`文件超过大小限制（${maxSizeMb} MB）`);
    }

    const port = await this.storage.resolve();
    const key = buildObjectKey(input.originalName);
    const url = await port.put({
      key,
      buffer: input.buffer,
      mimeType: input.mimeType,
    });

    const entity = new UploadedFileEntity();
    entity.key = key;
    entity.url = url;
    entity.filename = input.originalName;
    entity.size = input.size;
    entity.mimeType = input.mimeType;
    entity.driver = port.driver;
    entity.uploaderId = uploaderId;

    const saved = await this.fileRepo.save(entity);
    return toUploadedFile(saved);
  }
}
