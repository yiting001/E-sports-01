import type { UploadedFile } from '@app/contracts';
import { ENV } from '@/config/env';
import { toast } from '@/utils/toast';
import { buildAuthHeaders } from './http';

/**
 * C 端文件上传接口（uni.uploadFile）。
 * 小程序端只支持图片（uni.chooseImage 来源相册/相机，触发隐私授权由微信框架处理），
 * 超过 8MB 直接拒绝；服务端 /upload/self 返回统一响应包，需手动解包。
 */

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function chooseImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (result) => resolve(result.tempFilePaths[0] ?? ''),
      fail: () => reject(new Error('未选择图片')),
    });
  });
}

function upload(tempFilePath: string): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${ENV.apiBaseUrl}/upload/self`,
      filePath: tempFilePath,
      name: 'file',
      header: buildAuthHeaders(),
      success: (result) => {
        try {
          const body = JSON.parse(result.data) as {
            code: number;
            message: string;
            data: UploadedFile;
          };
          if (result.statusCode === 200 && body.code === 0) {
            resolve(body.data);
            return;
          }
          reject(new Error(body.message || '上传失败'));
        } catch {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: () => reject(new Error('上传失败，请检查网络')),
    });
  });
}

export const uploadApi = {
  /** 上传指定本地临时文件（微信头像昵称填写能力返回的路径等） */
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
      return await upload(tempFilePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败';
      toast(message);
      throw error;
    }
  },

  /** 选择一张图片并上传，返回可访问 URL；错误统一 toast 后抛出 */
  async chooseAndUploadImage(): Promise<UploadedFile> {
    try {
      const tempFilePath = await chooseImage();
      return await this.uploadTempImage(tempFilePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败';
      toast(message);
      throw error;
    }
  },
};
