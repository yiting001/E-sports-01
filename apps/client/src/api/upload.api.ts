import type { UploadedFile } from '@app/contracts';
import { useToast } from '@/composables/use-toast';
import { browserImageCodec } from '@/utils/browser-image-codec';
import { prepareUploadMedia } from '@/utils/upload-media';
import { http } from './http';

/**
 * C 端文件上传接口：登录用户自助上传（无需 upload:file:upload 权限）。
 * 所有图片在此统一压缩后再上传，视频超限直接拒绝；预处理失败与 HTTP 错误一样走 toast 提示，
 * 调用方只需按 Promise 失败处理，无需各自校验。
 */
export const uploadApi = {
  async uploadSelf(file: File): Promise<UploadedFile> {
    let prepared: File;
    try {
      prepared = await prepareUploadMedia(file, browserImageCodec);
    } catch (error) {
      useToast().show(error instanceof Error ? error.message : '文件处理失败');
      throw error;
    }
    const form = new FormData();
    form.append('file', prepared);
    return http.post('/upload/self', form);
  },
};
