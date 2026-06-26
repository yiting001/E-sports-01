import { UploadedFileEntity } from './uploaded-file.entity';

/** 文件仓储注入令牌（领域层只依赖接口，实现由基础设施层提供） */
export const FILE_REPOSITORY = Symbol('FILE_REPOSITORY');

/** 文件元数据仓储接口 */
export interface FileRepository {
  save(file: UploadedFileEntity): Promise<UploadedFileEntity>;
  findById(id: string): Promise<UploadedFileEntity | null>;
  /** 分页查询，按创建时间倒序 */
  paginate(skip: number, take: number): Promise<[UploadedFileEntity[], number]>;
  remove(id: string): Promise<void>;
}
