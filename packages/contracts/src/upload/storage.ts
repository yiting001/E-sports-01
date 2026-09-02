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

/**
 * 前端上传前的媒体处理约束（管理端与 C 端共享）。
 * 图片在浏览器内先重采样压缩再上传，避免原图过大导致后台加载卡顿；
 * 视频暂不做浏览器端转码，仅在前端限制体积并提示，服务端 upload.maxFileSize 仍为最终兜底。
 */
export const UPLOAD_MEDIA_LIMITS = {
  /** 图片压缩后长边最大像素 */
  imageMaxEdge: 1920,
  /** 有损编码质量（0-1） */
  imageQuality: 0.82,
  /** 体积低于该值且尺寸未超限的图片直接上传，不做重编码 */
  imageSkipBelowBytes: 200 * 1024,
  /** 视频单文件最大体积（MB），超过则前端拒绝并提示 */
  videoMaxSizeMb: 50,
} as const;

/** 不做重编码的图片类型：GIF 会丢动画、SVG 为矢量、非 image/* 内容一律原样上传 */
export const IMAGE_COMPRESS_EXCLUDED_MIME_TYPES: readonly string[] = [
  'image/gif',
  'image/svg+xml',
];
