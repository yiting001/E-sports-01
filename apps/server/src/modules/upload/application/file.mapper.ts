import { UploadedFile, UploadedFileView } from '@app/contracts';
import { UploadedFileEntity } from '../domain/uploaded-file.entity';

/** 实体 → 上传响应（仅核心字段） */
export function toUploadedFile(entity: UploadedFileEntity): UploadedFile {
  return {
    url: entity.url,
    key: entity.key,
    filename: entity.filename,
    size: Number(entity.size),
    mimeType: entity.mimeType,
  };
}

/** 实体 → 列表/详情视图（含持久化元数据） */
export function toUploadedFileView(entity: UploadedFileEntity): UploadedFileView {
  return {
    ...toUploadedFile(entity),
    id: entity.id,
    driver: entity.driver,
    uploaderId: entity.uploaderId,
    createdAt: entity.createdAt.toISOString(),
  };
}
