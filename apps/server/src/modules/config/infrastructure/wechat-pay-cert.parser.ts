import { X509Certificate } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import forge from 'node-forge';

/** 从证书文件解析出的凭证材料（正文只写入配置中心敏感项，不回传、不落日志） */
export interface WechatPayCertMaterial {
  /** 私钥（PKCS#8 PEM）；文件不含私钥时为空串 */
  privateKeyPem: string;
  /** 证书对应的公钥（SPKI PEM）；文件不含证书/公钥时为空串 */
  publicKeyPem: string;
  /** 证书序列号（大写十六进制）；纯私钥/公钥文件为空串 */
  serialNo: string;
}

const PEM_PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/;
const PEM_CERTIFICATE = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/;
const PEM_PUBLIC_KEY = /-----BEGIN PUBLIC KEY-----[\s\S]+?-----END PUBLIC KEY-----/;

/**
 * 微信支付证书文件解析器。
 * PEM 用 Node 内置 crypto 解析；P12（PKCS#12）用 node-forge 按口令解出私钥与证书。
 * 只在内存中处理，不写临时文件；解析失败抛可读错误且不携带文件内容。
 */
@Injectable()
export class WechatPayCertParser {
  /** 按文件内容自动识别 PEM / P12 并解析 */
  parse(file: Buffer, password: string): WechatPayCertMaterial {
    const head = file.subarray(0, 1024).toString('utf8');
    if (head.includes('-----BEGIN')) {
      return this.parsePem(file.toString('utf8'));
    }
    return this.parseP12(file, password);
  }

  private parsePem(text: string): WechatPayCertMaterial {
    const privateKeyPem = PEM_PRIVATE_KEY.exec(text)?.[0] ?? '';
    const certPem = PEM_CERTIFICATE.exec(text)?.[0] ?? '';
    const publicKeyOnly = PEM_PUBLIC_KEY.exec(text)?.[0] ?? '';
    if (!privateKeyPem && !certPem && !publicKeyOnly) {
      throw new BadRequestException('PEM 文件中未找到私钥、证书或公钥');
    }
    if (!certPem) {
      return { privateKeyPem, publicKeyPem: publicKeyOnly, serialNo: '' };
    }
    try {
      const cert = new X509Certificate(certPem);
      const publicKeyPem = cert.publicKey.export({ type: 'spki', format: 'pem' }).toString();
      return { privateKeyPem, publicKeyPem, serialNo: cert.serialNumber.toUpperCase() };
    } catch {
      throw new BadRequestException('证书解析失败，请确认文件为有效的 X.509 证书');
    }
  }

  private parseP12(file: Buffer, password: string): WechatPayCertMaterial {
    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      const der = forge.util.createBuffer(file.toString('binary'));
      const asn1 = forge.asn1.fromDer(der);
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    } catch {
      throw new BadRequestException('P12 解析失败，请确认文件格式与口令（微信支付默认口令为商户号）');
    }
    const keyBags =
      p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
        forge.pki.oids.pkcs8ShroudedKeyBag
      ] ?? [];
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
    const key = keyBags[0]?.key;
    const cert = certBags[0]?.cert;
    if (!key || !cert) {
      throw new BadRequestException('P12 文件中未找到私钥或证书');
    }
    const privateKeyPem = forge.pki.privateKeyInfoToPem(
      forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(key)),
    );
    const publicKeyPem = forge.pki.publicKeyToPem(cert.publicKey);
    return {
      privateKeyPem,
      publicKeyPem,
      serialNo: cert.serialNumber.toUpperCase(),
    };
  }
}
