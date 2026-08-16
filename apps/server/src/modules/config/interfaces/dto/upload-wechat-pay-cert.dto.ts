import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { WechatPayCertUsage } from '@app/contracts';

/** 上传微信支付证书文件入参（multipart 表单字段，file 字段为证书文件） */
export class UploadWechatPayCertDto {
  /** 证书用途：merchant（商户私钥/证书）/ platform（平台验签证书或公钥） */
  @IsEnum(WechatPayCertUsage)
  usage!: WechatPayCertUsage;

  /** P12 口令（微信支付默认是商户号）；PEM 文件可不填 */
  @IsOptional()
  @IsString()
  @Length(0, 128)
  password?: string;
}
