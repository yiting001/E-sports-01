import type { UploadedFile } from '@app/contracts';
import { http } from './http';

/** C 端文件上传接口：登录用户自助上传（无需 upload:file:upload 权限） */
export const uploadApi = {
  uploadSelf(file: File): Promise<UploadedFile> {
    const form = new FormData();
    form.append('file', file);
    return http.post('/upload/self', form);
  },
};
