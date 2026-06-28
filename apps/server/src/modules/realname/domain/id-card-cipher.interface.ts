export const ID_CARD_CIPHER = Symbol('ID_CARD_CIPHER');

/**
 * 身份证号加解密端口。
 * 领域/应用层只依赖该抽象提交明文/取回明文，具体算法与密钥来源由基础设施实现。
 */
export interface IdCardCipherPort {
  /** 加密明文身份证号 → 密文串 */
  encrypt(plain: string): Promise<string>;
  /** 解密密文 → 明文身份证号 */
  decrypt(cipher: string): Promise<string>;
}
