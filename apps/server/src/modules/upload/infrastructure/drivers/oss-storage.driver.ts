import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import OSS from 'ali-oss';
import { CONFIG_KEYS, StorageDriver } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  StoragePort,
  StoragePutInput,
} from '../../domain/storage-driver.interface';

/**
 * 阿里云 OSS 存储驱动。
 * 客户端凭证全部来自配置中心，按需创建；未配置时给出明确报错，
 * 不影响默认 local 驱动的正常使用。
 */
@Injectable()
export class OssStorageDriver implements StoragePort {
  readonly driver = StorageDriver.Oss;

  constructor(private readonly config: ConfigService) {}

  async put(input: StoragePutInput): Promise<string> {
    const client = await this.client();
    const result = await client.put(input.key, input.buffer, {
      mime: input.mimeType,
    });
    return result.url;
  }

  async remove(key: string): Promise<void> {
    const client = await this.client();
    await client.delete(key);
  }

  /** 依据配置中心凭证创建 OSS 客户端 */
  private async client(): Promise<OSS> {
    const [endpoint, bucket, accessKeyId, accessKeySecret] = await Promise.all([
      this.config.getString(CONFIG_KEYS.upload.ossEndpoint, ''),
      this.config.getString(CONFIG_KEYS.upload.ossBucket, ''),
      this.config.getString(CONFIG_KEYS.upload.ossAccessKeyId, ''),
      this.config.getString(CONFIG_KEYS.upload.ossAccessKeySecret, ''),
    ]);
    if (!endpoint || !bucket || !accessKeyId || !accessKeySecret) {
      throw new InternalServerErrorException(
        'OSS 未配置完整，请在配置中心补全 upload.oss.* 项',
      );
    }
    return new OSS({ endpoint, bucket, accessKeyId, accessKeySecret });
  }
}
