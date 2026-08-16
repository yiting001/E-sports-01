import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CONFIG_KEYS, WechatPayCertUploadResult, WechatPayCertUsage } from '@app/contracts';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { WechatPayCertParser } from '../../infrastructure/wechat-pay-cert.parser';
import { ConfigService } from '../config.service';

/** 证书文件大小上限（微信支付证书远小于该值，超限视为异常文件） */
const MAX_CERT_FILE_SIZE = 64 * 1024;

/**
 * 用例：上传微信支付证书文件（PEM / P12）并解析写入配置中心。
 * 商户用途写入私钥与商户证书序列号；平台用途写入回调验签公钥与平台证书序列号。
 * 私钥/公钥正文只落敏感配置项，不回传给前端、不写日志。
 */
@Injectable()
export class UploadWechatPayCertUseCase {
  constructor(
    private readonly parser: WechatPayCertParser,
    private readonly config: ConfigService,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(
    usage: WechatPayCertUsage,
    file: Buffer,
    password: string,
  ): Promise<WechatPayCertUploadResult> {
    if (!this.tenant.isSuper) {
      throw new ForbiddenException('租户管理员不能修改平台支付证书');
    }
    if (file.length === 0 || file.length > MAX_CERT_FILE_SIZE) {
      throw new BadRequestException('证书文件为空或超出大小限制');
    }
    const material = this.parser.parse(file, password);
    const updatedKeys: string[] = [];
    if (usage === WechatPayCertUsage.Merchant) {
      if (!material.privateKeyPem) {
        throw new BadRequestException('商户证书文件中未找到私钥（请上传 apiclient_key.pem 或 apiclient_cert.p12）');
      }
      await this.config.setRaw(CONFIG_KEYS.wallet.wechatPrivateKey, material.privateKeyPem, {
        secret: true,
      });
      updatedKeys.push(CONFIG_KEYS.wallet.wechatPrivateKey);
      if (material.serialNo) {
        await this.config.setRaw(CONFIG_KEYS.wallet.wechatSerialNo, material.serialNo);
        updatedKeys.push(CONFIG_KEYS.wallet.wechatSerialNo);
      }
    } else {
      if (!material.publicKeyPem) {
        throw new BadRequestException('平台证书文件中未找到证书或公钥');
      }
      await this.config.setRaw(
        CONFIG_KEYS.wallet.wechatPlatformPublicKey,
        material.publicKeyPem,
        { secret: true },
      );
      updatedKeys.push(CONFIG_KEYS.wallet.wechatPlatformPublicKey);
      if (material.serialNo) {
        await this.config.setRaw(CONFIG_KEYS.wallet.wechatPlatformSerialNo, material.serialNo);
        updatedKeys.push(CONFIG_KEYS.wallet.wechatPlatformSerialNo);
      }
    }
    return { usage, updatedKeys, serialNo: material.serialNo };
  }
}
