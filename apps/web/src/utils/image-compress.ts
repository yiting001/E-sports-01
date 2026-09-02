import { IMAGE_COMPRESS_EXCLUDED_MIME_TYPES, UPLOAD_MEDIA_LIMITS } from '@app/contracts';

/**
 * 浏览器端图片压缩：上传前统一重采样并重新编码，避免原图直传导致后台加载卡顿。
 * 编解码能力通过 ImageCodec 注入，纯逻辑（尺寸计算、跳过判定、格式选择）可在 Node 下单测。
 * Canvas 重编码会丢弃 EXIF（含 GPS），方向信息在解码阶段已应用到像素。
 */

export interface ImageSize {
  width: number;
  height: number;
}

export interface ImageCompressLimits {
  imageMaxEdge: number;
  imageQuality: number;
  imageSkipBelowBytes: number;
}

/** 已解码位图：仅暴露压缩流程需要的尺寸与释放能力 */
export interface DecodedImage extends ImageSize {
  close(): void;
}

export interface ImageCodec {
  /** 解码文件为位图，无法解码时抛错 */
  decode(file: Blob): Promise<DecodedImage>;
  /**
   * 将位图缩放到目标尺寸并编码为指定 MIME。
   * 浏览器不支持该 MIME 时可能返回 null 或回退为其它类型，调用方按 blob.type 判定是否采纳。
   */
  encode(
    image: DecodedImage,
    size: ImageSize,
    mimeType: string,
    quality: number,
  ): Promise<Blob | null>;
}

export class ImageCompressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageCompressError';
  }
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export function isCompressibleImage(file: Pick<File, 'type'>): boolean {
  return (
    file.type.startsWith('image/') &&
    !IMAGE_COMPRESS_EXCLUDED_MIME_TYPES.includes(file.type)
  );
}

/** 等比缩小到长边不超过 maxEdge，不放大，最小 1px */
export function fitWithin(size: ImageSize, maxEdge: number): ImageSize {
  const longest = Math.max(size.width, size.height);
  if (longest <= maxEdge) {
    return { width: size.width, height: size.height };
  }
  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(size.width * ratio)),
    height: Math.max(1, Math.round(size.height * ratio)),
  };
}

/** 体积已足够小且尺寸未超限时无需重编码 */
export function shouldSkipCompression(
  fileSize: number,
  image: ImageSize,
  limits: ImageCompressLimits,
): boolean {
  return (
    fileSize < limits.imageSkipBelowBytes &&
    Math.max(image.width, image.height) <= limits.imageMaxEdge
  );
}

/** 输出格式候选：优先 WebP；PNG 需保留透明通道故回退 PNG，其余回退 JPEG */
export function outputMimeCandidates(sourceType: string): string[] {
  const fallback = sourceType === 'image/png' ? 'image/png' : 'image/jpeg';
  return ['image/webp', fallback];
}

/** 按输出 MIME 替换扩展名，保留原始主文件名便于后台识别 */
export function renameForMimeType(name: string, mimeType: string): string {
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) {
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${extension}`;
}

async function encodeWithFallback(
  codec: ImageCodec,
  image: DecodedImage,
  target: ImageSize,
  sourceType: string,
  quality: number,
): Promise<Blob> {
  for (const candidate of outputMimeCandidates(sourceType)) {
    const blob = await codec.encode(image, target, candidate, quality);
    if (blob && blob.type === candidate && blob.size > 0) {
      return blob;
    }
  }
  throw new ImageCompressError('当前浏览器不支持图片压缩，请更换浏览器后重试');
}

/**
 * 压缩图片文件。非图片或 GIF/SVG 原样返回；
 * 重编码结果不比原文件小且尺寸未缩放时保留原文件（原文件本身已足够小）。
 */
export async function compressImage(
  file: File,
  codec: ImageCodec,
  limits: ImageCompressLimits = UPLOAD_MEDIA_LIMITS,
): Promise<File> {
  if (!isCompressibleImage(file)) {
    return file;
  }
  let image: DecodedImage;
  try {
    image = await codec.decode(file);
  } catch {
    throw new ImageCompressError('图片无法解析，请更换图片后重试');
  }
  try {
    if (shouldSkipCompression(file.size, image, limits)) {
      return file;
    }
    const target = fitWithin(image, limits.imageMaxEdge);
    const blob = await encodeWithFallback(codec, image, target, file.type, limits.imageQuality);
    const resized = target.width !== image.width || target.height !== image.height;
    if (!resized && blob.size >= file.size) {
      return file;
    }
    return new File([blob], renameForMimeType(file.name, blob.type), {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    image.close();
  }
}
