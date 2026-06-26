import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { CONFIG_KEYS, StorageDriver } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  StoragePort,
  StoragePutInput,
} from '../../domain/storage-driver.interface';

const FALLBACK_DIR = 'uploads';
const FALLBACK_BASE_URL = 'http://127.0.0.1:3000/static';

/**
 * 本地存储驱动。
 * 将文件写入工作目录下的可配置目录，并通过静态资源路由对外暴露；
 * 目录与基础 URL 均来自配置中心，避免硬编码。
 */
@Injectable()
export class LocalStorageDriver implements StoragePort {
  readonly driver = StorageDriver.Local;

  constructor(private readonly config: ConfigService) {}

  async put(input: StoragePutInput): Promise<string> {
    const baseDir = await this.baseDir();
    const fullPath = join(baseDir, input.key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, input.buffer);
    const baseUrl = await this.config.getString(
      CONFIG_KEYS.upload.localBaseUrl,
      FALLBACK_BASE_URL,
    );
    return `${baseUrl.replace(/\/$/, '')}/${input.key}`;
  }

  async remove(key: string): Promise<void> {
    const baseDir = await this.baseDir();
    await rm(join(baseDir, key), { force: true });
  }

  /** 解析存储根目录（相对路径基于进程工作目录） */
  private async baseDir(): Promise<string> {
    const dir = await this.config.getString(
      CONFIG_KEYS.upload.localDir,
      FALLBACK_DIR,
    );
    return resolve(process.cwd(), dir);
  }
}
