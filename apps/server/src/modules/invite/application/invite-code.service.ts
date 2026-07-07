import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { INVITE_LIMITS } from '@app/contracts';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../domain/invite-repository.interface';

/** 邀请码字符集：大写字母+数字，去除易混淆的 0/O/1/I */
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 生成一枚随机邀请码 */
function randomCode(): string {
  return Array.from(
    { length: INVITE_LIMITS.codeLength },
    () => CODE_CHARSET[randomInt(CODE_CHARSET.length)],
  ).join('');
}

/**
 * 邀请码服务：一人一码，首次访问惰性生成。
 * 码撞库（唯一约束冲突）时重新生成重试；并发生成同一用户时回查已存在的码保证幂等。
 */
@Injectable()
export class InviteCodeService {
  constructor(
    @Inject(INVITE_REPOSITORY)
    private readonly repo: InviteRepository,
  ) {}

  async getOrCreate(userId: string): Promise<string> {
    const existing = await this.repo.findCodeByUser(userId);
    if (existing) {
      return existing.code;
    }
    for (;;) {
      try {
        const saved = await this.repo.saveCode({
          userId,
          code: randomCode(),
        });
        return saved.code;
      } catch {
        // 唯一约束冲突：同用户并发生成则回查复用；码撞库则换码重试
        const concurrent = await this.repo.findCodeByUser(userId);
        if (concurrent) {
          return concurrent.code;
        }
      }
    }
  }
}
