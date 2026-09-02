import { UPLOAD_MEDIA_LIMITS } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  compressImage,
  fitWithin,
  ImageCompressError,
  isCompressibleImage,
  outputMimeCandidates,
  renameForMimeType,
  shouldSkipCompression,
  type DecodedImage,
  type ImageCodec,
  type ImageSize,
} from './image-compress';

const LIMITS = { imageMaxEdge: 1000, imageQuality: 0.8, imageSkipBelowBytes: 1024 };

function makeFile(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

interface FakeCodecOptions {
  size: ImageSize;
  /** 各 MIME 编码结果：数组为返回 blob 的类型与字节数，null 表示浏览器不支持 */
  outputs: Record<string, { type: string; bytes: number } | null>;
}

function fakeCodec(options: FakeCodecOptions) {
  const close = vi.fn();
  const encode = vi.fn(
    async (_image: DecodedImage, _size: ImageSize, mimeType: string): Promise<Blob | null> => {
      const output = options.outputs[mimeType];
      return output ? new Blob([new Uint8Array(output.bytes)], { type: output.type }) : null;
    },
  );
  const codec: ImageCodec = {
    decode: vi.fn(async () => ({ ...options.size, close })),
    encode,
  };
  return { codec, encode, close };
}

describe('图片压缩纯逻辑', () => {
  it('仅 image/* 且非 GIF/SVG 才参与压缩', () => {
    expect(isCompressibleImage({ type: 'image/jpeg' })).toBe(true);
    expect(isCompressibleImage({ type: 'image/png' })).toBe(true);
    expect(isCompressibleImage({ type: 'image/gif' })).toBe(false);
    expect(isCompressibleImage({ type: 'image/svg+xml' })).toBe(false);
    expect(isCompressibleImage({ type: 'video/mp4' })).toBe(false);
  });

  it('等比缩小到长边上限且不放大', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1920)).toEqual({ width: 1920, height: 1440 });
    expect(fitWithin({ width: 1080, height: 2400 }, 1920)).toEqual({ width: 864, height: 1920 });
    expect(fitWithin({ width: 800, height: 600 }, 1920)).toEqual({ width: 800, height: 600 });
    expect(fitWithin({ width: 10000, height: 1 }, 1920)).toEqual({ width: 1920, height: 1 });
  });

  it('小体积且尺寸未超限才跳过压缩', () => {
    expect(shouldSkipCompression(500, { width: 100, height: 100 }, LIMITS)).toBe(true);
    expect(shouldSkipCompression(500, { width: 1001, height: 100 }, LIMITS)).toBe(false);
    expect(shouldSkipCompression(1024, { width: 100, height: 100 }, LIMITS)).toBe(false);
  });

  it('输出格式优先 WebP，PNG 回退 PNG、其余回退 JPEG', () => {
    expect(outputMimeCandidates('image/png')).toEqual(['image/webp', 'image/png']);
    expect(outputMimeCandidates('image/jpeg')).toEqual(['image/webp', 'image/jpeg']);
    expect(outputMimeCandidates('image/heic')).toEqual(['image/webp', 'image/jpeg']);
  });

  it('按输出类型替换扩展名并保留主文件名', () => {
    expect(renameForMimeType('IMG_0001.HEIC', 'image/webp')).toBe('IMG_0001.webp');
    expect(renameForMimeType('photo', 'image/jpeg')).toBe('photo.jpg');
    expect(renameForMimeType('.hidden.png', 'image/png')).toBe('.hidden.png');
    expect(renameForMimeType('a.b.png', 'image/unknown')).toBe('a.b.png');
  });
});

describe('compressImage', () => {
  it('大图缩放并输出 WebP，文件名扩展名同步替换', async () => {
    const { codec, encode, close } = fakeCodec({
      size: { width: 4000, height: 2000 },
      outputs: { 'image/webp': { type: 'image/webp', bytes: 300 } },
    });
    const result = await compressImage(makeFile('a.jpg', 'image/jpeg', 5000), codec, LIMITS);

    expect(result.name).toBe('a.webp');
    expect(result.type).toBe('image/webp');
    expect(result.size).toBe(300);
    expect(encode).toHaveBeenCalledWith(
      expect.objectContaining({ width: 4000, height: 2000 }),
      { width: 1000, height: 500 },
      'image/webp',
      0.8,
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('浏览器不支持 WebP（返回 null 或回退 PNG）时改用 JPEG', async () => {
    const { codec, encode } = fakeCodec({
      size: { width: 3000, height: 3000 },
      outputs: {
        'image/webp': { type: 'image/png', bytes: 900 },
        'image/jpeg': { type: 'image/jpeg', bytes: 400 },
      },
    });
    const result = await compressImage(makeFile('a.jpeg', 'image/jpeg', 5000), codec, LIMITS);

    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('a.jpg');
    expect(encode).toHaveBeenCalledTimes(2);
  });

  it('全部编码格式均不可用时报错而非静默传原图', async () => {
    const { codec } = fakeCodec({
      size: { width: 3000, height: 3000 },
      outputs: { 'image/webp': null, 'image/jpeg': null },
    });
    await expect(
      compressImage(makeFile('a.jpg', 'image/jpeg', 5000), codec, LIMITS),
    ).rejects.toBeInstanceOf(ImageCompressError);
  });

  it('解码失败抛出 ImageCompressError', async () => {
    const codec: ImageCodec = {
      decode: vi.fn(async () => {
        throw new Error('boom');
      }),
      encode: vi.fn(),
    };
    await expect(
      compressImage(makeFile('a.heic', 'image/heic', 5000), codec, LIMITS),
    ).rejects.toThrow('图片无法解析');
  });

  it('小图直接返回原文件，不调用编码', async () => {
    const { codec, encode } = fakeCodec({
      size: { width: 200, height: 200 },
      outputs: { 'image/webp': { type: 'image/webp', bytes: 100 } },
    });
    const file = makeFile('s.png', 'image/png', 500);
    expect(await compressImage(file, codec, LIMITS)).toBe(file);
    expect(encode).not.toHaveBeenCalled();
  });

  it('未缩放且重编码后更大时保留原文件', async () => {
    const { codec } = fakeCodec({
      size: { width: 900, height: 900 },
      outputs: { 'image/webp': { type: 'image/webp', bytes: 6000 } },
    });
    const file = makeFile('a.jpg', 'image/jpeg', 5000);
    expect(await compressImage(file, codec, LIMITS)).toBe(file);
  });

  it('GIF 与非图片原样返回，不解码', async () => {
    const { codec } = fakeCodec({ size: { width: 1, height: 1 }, outputs: {} });
    const gif = makeFile('a.gif', 'image/gif', 5000);
    const pdf = makeFile('a.pdf', 'application/pdf', 5000);
    expect(await compressImage(gif, codec, LIMITS)).toBe(gif);
    expect(await compressImage(pdf, codec, LIMITS)).toBe(pdf);
    expect(codec.decode).not.toHaveBeenCalled();
  });

  it('默认使用 contracts 中的共享阈值', async () => {
    const { codec, encode } = fakeCodec({
      size: { width: 5000, height: 5000 },
      outputs: { 'image/webp': { type: 'image/webp', bytes: 10 } },
    });
    await compressImage(makeFile('a.jpg', 'image/jpeg', 10_000_000), codec);
    expect(encode).toHaveBeenCalledWith(
      expect.anything(),
      { width: UPLOAD_MEDIA_LIMITS.imageMaxEdge, height: UPLOAD_MEDIA_LIMITS.imageMaxEdge },
      'image/webp',
      UPLOAD_MEDIA_LIMITS.imageQuality,
    );
  });
});
