import type { DecodedImage, ImageCodec, ImageSize } from './image-compress';

/**
 * 基于浏览器 Canvas 的 ImageCodec 实现。
 * 解码优先 createImageBitmap（自动应用 EXIF 方向），不支持时退回 <img> 元素；
 * 编码使用 canvas.toBlob，JPEG 无透明通道，先铺白底避免透明区域变黑。
 */

interface BitmapDecoded extends DecodedImage {
  source: CanvasImageSource;
}

function decodeWithImageElement(file: Blob): Promise<BitmapDecoded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      resolve({
        width: element.naturalWidth,
        height: element.naturalHeight,
        source: element,
        close: () => URL.revokeObjectURL(url),
      });
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片解码失败'));
    };
    element.src = url;
  });
}

async function decodeWithBitmap(file: Blob): Promise<BitmapDecoded> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return {
    width: bitmap.width,
    height: bitmap.height,
    source: bitmap,
    close: () => bitmap.close(),
  };
}

function isBitmapDecoded(image: DecodedImage): image is BitmapDecoded {
  return 'source' in image;
}

function toBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function encode(
  image: DecodedImage,
  size: ImageSize,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  if (!isBitmapDecoded(image)) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  if (mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);
  }
  context.drawImage(image.source, 0, 0, size.width, size.height);
  return toBlob(canvas, mimeType, quality);
}

export const browserImageCodec: ImageCodec = {
  decode(file: Blob): Promise<DecodedImage> {
    if (typeof createImageBitmap === 'function') {
      return decodeWithBitmap(file);
    }
    return decodeWithImageElement(file);
  },
  encode,
};
