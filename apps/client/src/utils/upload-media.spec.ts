import { describe, expect, it, vi } from 'vitest';
import type { ImageCodec } from './image-compress';
import { MediaUploadError, prepareUploadMedia } from './upload-media';

const LIMITS = { imageMaxEdge: 1000, imageQuality: 0.8, imageSkipBelowBytes: 1024, videoMaxSizeMb: 1 };

function makeFile(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function codecStub(): ImageCodec {
  return {
    decode: vi.fn(async () => ({ width: 3000, height: 3000, close: vi.fn() })),
    encode: vi.fn(async () => new Blob([new Uint8Array(10)], { type: 'image/webp' })),
  };
}

describe('prepareUploadMedia', () => {
  it('视频超过体积上限时拒绝并给出提示', async () => {
    const codec = codecStub();
    await expect(
      prepareUploadMedia(makeFile('v.mp4', 'video/mp4', 1024 * 1024 + 1), codec, LIMITS),
    ).rejects.toMatchObject({ name: 'MediaUploadError', message: '视频不能超过 1 MB，请压缩后再上传' });
    expect(codec.decode).not.toHaveBeenCalled();
  });

  it('体积合规的视频原样上传', async () => {
    const video = makeFile('v.mp4', 'video/mp4', 1024 * 1024);
    expect(await prepareUploadMedia(video, codecStub(), LIMITS)).toBe(video);
  });

  it('图片走压缩流程', async () => {
    const result = await prepareUploadMedia(makeFile('p.jpg', 'image/jpeg', 5000), codecStub(), LIMITS);
    expect(result.type).toBe('image/webp');
    expect(result.name).toBe('p.webp');
  });

  it('非媒体文件原样上传', async () => {
    const doc = makeFile('a.pdf', 'application/pdf', 5000);
    expect(await prepareUploadMedia(doc, codecStub(), LIMITS)).toBe(doc);
  });

  it('MediaUploadError 可被 instanceof 识别', () => {
    expect(new MediaUploadError('x')).toBeInstanceOf(Error);
  });
});
