/** 文件存储驱动，默认 local */
export enum StorageDriver {
  Local = 'local',
  Oss = 'oss',
}

/** 上传成功后返回的文件信息 */
export interface UploadedFile {
  /** 可访问 URL */
  url: string;
  /** 存储相对路径/对象 key */
  key: string;
  /** 原始文件名 */
  filename: string;
  /** 字节大小 */
  size: number;
  mimeType: string;
}

/** 文件记录对外结构（用于列表/详情，含持久化元数据） */
export interface UploadedFileView extends UploadedFile {
  id: string;
  /** 实际使用的存储驱动 */
  driver: StorageDriver;
  /** 上传者用户 ID */
  uploaderId: string;
  createdAt: string;
}
