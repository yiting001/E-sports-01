import { randomInt } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { CONFIG_KEYS } from '@app/contracts';
import { REDIS_CLIENT } from '../../../shared/redis/redis.constants';
import { ConfigService } from '../../config/application/config.service';
import { SmsResolver } from './sms.resolver';

/** 验证码在 Redis 中的键前缀 */
const CODE_KEY_PREFIX = 'sms:code:login:';
/** 发送间隔锁在 Redis 中的键前缀 */
const INTERVAL_KEY_PREFIX = 'sms:code:interval:';

/**
 * 短信验证码服务（业务无关的通用能力）。
 * 负责验证码的生成、Redis 存储与有效期、发送限流、以及校验消费；
 * 真正的发送动作委托给按配置选中的短信驱动（SmsResolver），与具体服务商解耦。
 */
@Injectable()
export class SmsCodeService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly resolver: SmsResolver,
  ) {}

  /**
   * 向手机号发送验证码。
   * 命中发送间隔则拒绝（限流）；发送成功后才写入验证码与间隔锁，发送失败不留痕、可重试。
   * @returns 本次发送对应的冷却秒数，供前端倒计时
   */
  async send(phone: string): Promise<number> {
    const interval = await this.config.getNumber(CONFIG_KEYS.sms.sendInterval, 60);
    const remaining = await this.redis.ttl(this.intervalKey(phone));
    if (remaining > 0) {
      throw new BadRequestException(`发送过于频繁，请 ${remaining} 秒后再试`);
    }

    const length = await this.config.getNumber(CONFIG_KEYS.sms.codeLength, 6);
    const codeTtl = await this.config.getNumber(CONFIG_KEYS.sms.codeTtl, 300);
    const code = this.generateCode(length);

    const port = await this.resolver.resolve();
    await port.sendCode({ phone, code });

    await this.redis.set(this.codeKey(phone), code, 'EX', codeTtl);
    await this.redis.set(this.intervalKey(phone), '1', 'EX', interval);
    return interval;
  }

  /** 校验验证码：匹配成功即消费（删除），防止重复使用 */
  async verify(phone: string, code: string): Promise<boolean> {
    const key = this.codeKey(phone);
    const stored = await this.redis.get(key);
    if (!stored || stored !== code) {
      return false;
    }
    await this.redis.del(key);
    return true;
  }

  /** 生成定长纯数字验证码（使用 CSPRNG，避免可预测） */
  private generateCode(length: number): string {
    const upperBound = 10 ** length;
    return randomInt(0, upperBound).toString().padStart(length, '0');
  }

  private codeKey(phone: string): string {
    return `${CODE_KEY_PREFIX}${phone}`;
  }

  private intervalKey(phone: string): string {
    return `${INTERVAL_KEY_PREFIX}${phone}`;
  }
}
