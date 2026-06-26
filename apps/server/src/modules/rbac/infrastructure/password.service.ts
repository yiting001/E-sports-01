import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

/**
 * 密码哈希服务。
 * 封装 bcrypt，单一职责：只负责口令的散列与校验。
 */
@Injectable()
export class PasswordService {
  private static readonly SALT_ROUNDS = 10;

  hash(plain: string): Promise<string> {
    return hash(plain, PasswordService.SALT_ROUNDS);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
