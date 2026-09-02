import type { PaginatedResult, UploadedFile, UploadedFileView } from '@app/contracts';
import { ElMessage } from 'element-plus';
import { browserImageCodec } from '@/utils/browser-image-codec';
import { prepareUploadMedia } from '@/utils/upload-media';
import { http } from './http';

/**
 * 文件上传接口。
 * 所有图片在此统一压缩后再上传，视频超限直接拒绝；预处理失败与 HTTP 错误一样统一弹出提示，
 * 调用方只需按 Promise 失败处理，无需各自校验。
 */
async function postMedia(path: string, file: File): Promise<UploadedFile> {
  let prepared: File;
  try {
    prepared = await prepareUploadMedia(file, browserImageCodec);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '文件处理失败');
    throw error;
  }
  const form = new FormData();
  form.append('file', prepared);
  return http.post(path, form);
}

export const uploadApi = {
  upload(file: File): Promise<UploadedFile> {
    return postMedia('/upload', file);
  },
  /** 登录用户自助上传（无需 upload:file:upload 权限），供头像/实名证件等场景 */
  uploadSelf(file: File): Promise<UploadedFile> {
    return postMedia('/upload/self', file);
  },
  list(page: number, pageSize: number): Promise<PaginatedResult<UploadedFileView>> {
    return http.get('/upload/files', { params: { page, pageSize } });
  },
  remove(id: string): Promise<void> {
    return http.delete(`/upload/files/${id}`);
  },
};
