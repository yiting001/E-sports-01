import { createDecipheriv, createCipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * 微信小程序「消息推送」协议工具（虚拟支付发货/代币通知走该机制）。
 *
 * - 明文模式：GET 校验用 sha1(sort(token, timestamp, nonce)) 与 signature 比对，原样返回 echostr；
 * - 安全模式：请求带 msg_signature，报文体为 AES-256-CBC 加密（key = Base64Decode(EncodingAESKey + '=')，
 *   IV 取 key 前 16 字节，PKCS7 填充，明文结构 = 16 字节随机串 + 4 字节大端消息长度 + 消息 + AppId），
 *   签名 = sha1(sort(token, timestamp, nonce, encrypt))。
 *
 * 与微信「公众号/小程序消息推送」的经典算法一致；不引入第三方依赖。
 */

/** 字典序排序后拼接再 sha1（微信要求的签名算法） */
export function wechatSignature(...parts: string[]): string {
  return createHash('sha1')
    .update([...parts].sort().join(''))
    .digest('hex');
}

/** 明文模式 URL 校验：signature === sha1(sort(token, timestamp, nonce)) */
export function verifyWechatPlainSignature(input: {
  token: string;
  timestamp: string;
  nonce: string;
  signature: string;
}): boolean {
  const expected = wechatSignature(input.token, input.timestamp, input.nonce);
  return expected === input.signature;
}

/** 安全模式签名校验：msg_signature === sha1(sort(token, timestamp, nonce, encrypt)) */
export function verifyWechatSecureSignature(input: {
  token: string;
  timestamp: string;
  nonce: string;
  encrypt: string;
  msgSignature: string;
}): boolean {
  const expected = wechatSignature(
    input.token,
    input.timestamp,
    input.nonce,
    input.encrypt,
  );
  return expected === input.msgSignature;
}

function aesKeyOf(encodingAesKey: string): Buffer {
  const key = Buffer.from(`${encodingAesKey}=`, 'base64');
  if (key.length !== 32) {
    throw new Error('EncodingAESKey 非法（应为 43 位 Base64 字符）');
  }
  return key;
}

/** 解密消息体，返回消息内容与其携带的 AppId */
export function decryptWechatMessage(
  encodingAesKey: string,
  encrypt: string,
): { message: string; appId: string } {
  const key = aesKeyOf(encodingAesKey);
  const decipher = createDecipheriv('aes-256-cbc', key, key.subarray(0, 16));
  decipher.setAutoPadding(false);
  const padded = Buffer.concat([
    decipher.update(Buffer.from(encrypt, 'base64')),
    decipher.final(),
  ]);
  const content = stripPkcs7(padded);
  const messageLength = content.readUInt32BE(16);
  const message = content.subarray(20, 20 + messageLength).toString('utf8');
  const appId = content.subarray(20 + messageLength).toString('utf8');
  return { message, appId };
}

/** 加密消息体（微信推送同构；用于本地联调与单测往返验证） */
export function encryptWechatMessage(
  encodingAesKey: string,
  message: string,
  appId: string,
): string {
  const key = aesKeyOf(encodingAesKey);
  const messageBuffer = Buffer.from(message, 'utf8');
  const header = Buffer.alloc(20);
  randomBytes(16).copy(header, 0);
  header.writeUInt32BE(messageBuffer.length, 16);
  const plain = Buffer.concat([header, messageBuffer, Buffer.from(appId, 'utf8')]);
  const cipher = createCipheriv('aes-256-cbc', key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([
    cipher.update(addPkcs7(plain)),
    cipher.final(),
  ]);
  return encrypted.toString('base64');
}

const BLOCK_SIZE = 32;

function addPkcs7(buffer: Buffer): Buffer {
  const padLength = BLOCK_SIZE - (buffer.length % BLOCK_SIZE);
  return Buffer.concat([buffer, Buffer.alloc(padLength, padLength)]);
}

function stripPkcs7(buffer: Buffer): Buffer {
  const padLength = buffer[buffer.length - 1];
  if (padLength < 1 || padLength > BLOCK_SIZE) {
    throw new Error('消息解密失败：填充字节非法');
  }
  return buffer.subarray(0, buffer.length - padLength);
}
