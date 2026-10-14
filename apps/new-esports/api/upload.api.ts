import { ENV } from '@/config/env';
import type { ApiResponse } from '@/types/api';
import type { UploadedFile } from '@/types/auth';
import { toast } from '@/utils/toast';
import { buildAuthHeaders } from './http';

/**
 * C 端文件上传（uni.uploadFile 走 multipart，登录用户自助上传）。
 * uni.request 是 JSON 通道，无法携带文件，故单独封装：
 * 复用 http 层的鉴权与租户头（buildAuthHeaders），响应包在此手动解包。
 */

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function uploadFile(tempFilePath: string): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${ENV.apiBaseUrl}/upload/self`,
      filePath: tempFilePath,
      name: 'file',
      header: buildAuthHeaders(),
      success: (result) => {
        let body: ApiResponse<UploadedFile> | null = null;
        try {
          body = JSON.parse(result.data) as ApiResponse<UploadedFile>;
        } catch {
          reject(new Error('上传响应解析失败'));
          return;
        }
        if (result.statusCode === 200 && body.code === 0) {
          resolve(body.data);
          return;
        }
        reject(new Error(body.message || '上传失败'));
      },
      fail: () => reject(new Error('上传失败，请检查网络')),
    });
  });
}

export const uploadApi = {
  /** 上传指定本地临时图片（先校验体积，错误统一 toast 后抛出） */
  async uploadTempImage(tempFilePath: string): Promise<UploadedFile> {
    try {
      if (!tempFilePath) {
        throw new Error('未选择图片');
      }
      const info = await new Promise<UniNamespace.GetFileInfoSuccess>((resolve, reject) => {
        uni.getFileInfo({
          filePath: tempFilePath,
          success: resolve,
          fail: () => reject(new Error('读取图片信息失败')),
        });
      });
      if (info.size > MAX_IMAGE_BYTES) {
        throw new Error('图片不能超过 8MB');
      }
      return await uploadFile(tempFilePath);
    } catch (error) {
      toast(error instanceof Error ? error.message : '上传失败');
      throw error;
    }
  },

  /** 选择一张图片并上传，返回可访问 URL（头像等场景） */
  async chooseAndUploadImage(): Promise<UploadedFile> {
    const tempFilePath = await new Promise<string>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (result) => resolve(result.tempFilePaths[0] ?? ''),
        fail: () => reject(new Error('未选择图片')),
      });
    }).catch((error: Error) => {
      // 用户取消选择不算错误，不打扰用户
      if (!error.message.includes('未选择')) {
        toast(error.message);
      }
      return '';
    });
    if (!tempFilePath) {
      throw new Error('未选择图片');
    }
    return this.uploadTempImage(tempFilePath);
  },
};
