import type { PaginatedResult, UploadedFile, UploadedFileView } from '@app/contracts';
import { http } from './http';

/** 文件上传接口 */
export const uploadApi = {
  upload(file: File): Promise<UploadedFile> {
    const form = new FormData();
    form.append('file', file);
    return http.post('/upload', form);
  },
  list(page: number, pageSize: number): Promise<PaginatedResult<UploadedFileView>> {
    return http.get('/upload/files', { params: { page, pageSize } });
  },
  remove(id: string): Promise<void> {
    return http.delete(`/upload/files/${id}`);
  },
};
