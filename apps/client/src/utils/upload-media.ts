import { UPLOAD_MEDIA_LIMITS } from '@app/contracts';
import { compressImage, type ImageCodec, type ImageCompressLimits } from './image-compress';

/**
 * 上传前的媒体预处理（uploadApi 统一入口调用，覆盖全部图片/视频上传场景）：
 * - 图片：浏览器端压缩后再上传；
 * - 视频：暂不做浏览器端转码，超过体积上限直接拒绝并提示；
 * - 其它文件：原样上传。
 */

export interface UploadMediaLimits extends ImageCompressLimits {
  videoMaxSizeMb: number;
}

const BYTES_PER_MB = 1024 * 1024;

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaUploadError';
  }
}

export function prepareUploadMedia(
  file: File,
  codec: ImageCodec,
  limits: UploadMediaLimits = UPLOAD_MEDIA_LIMITS,
): Promise<File> {
  if (file.type.startsWith('video/')) {
    if (file.size > limits.videoMaxSizeMb * BYTES_PER_MB) {
      return Promise.reject(
        new MediaUploadError(`视频不能超过 ${limits.videoMaxSizeMb} MB，请压缩后再上传`),
      );
    }
    return Promise.resolve(file);
  }
  return compressImage(file, codec, limits);
}
