import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { REALNAME_ID_CIPHER_KEY } from '../domain/realname.constants';
import { ConfigService } from '../../config/application/config.service';
import { IdCardCipherPort } from '../domain/id-card-cipher.interface';

/**
 * 身份证号 AES-256-GCM 加解密实现。
 * 密钥取自配置中心（`realname.idCipherKey`，由播种器首次随机生成并持久化），
 * 经 SHA-256 规整为 32 字节；密文格式 `ivHex:tagHex:dataHex`。
 */
@Injectable()
export class IdCardCipher implements IdCardCipherPort {
  private static readonly ALGORITHM = 'aes-256-gcm';

  constructor(private readonly config: ConfigService) {}

  async encrypt(plain: string): Promise<string> {
    const key = await this.resolveKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(IdCardCipher.ALGORITHM, key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${data.toString('hex')}`;
  }

  async decrypt(cipherText: string): Promise<string> {
    const [ivHex, tagHex, dataHex] = cipherText.split(':');
    const key = await this.resolveKey();
    const decipher = createDecipheriv(
      IdCardCipher.ALGORITHM,
      key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }

  /** 读取配置密钥并规整为 32 字节 */
  private async resolveKey(): Promise<Buffer> {
    const raw = await this.config.getString(REALNAME_ID_CIPHER_KEY, '');
    return createHash('sha256').update(raw).digest();
  }
}
