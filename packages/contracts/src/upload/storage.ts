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
