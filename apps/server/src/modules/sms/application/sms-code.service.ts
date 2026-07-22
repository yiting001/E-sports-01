import { randomInt, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { CONFIG_KEYS } from '@app/contracts';
import { REDIS_CLIENT } from '../../../shared/redis/redis.constants';
import { ConfigService } from '../../config/application/config.service';
import type { SmsCodeScope } from '../domain/sms-code-scope';
import { SMS_RUNTIME_POLICY, type SmsRuntimePolicy } from '../domain/sms-runtime-policy.interface';
import { SmsResolver } from './sms.resolver';

/** 验证码在 Redis 中的键前缀 */
const CODE_KEY_PREFIX = 'sms:code:';
/** 发送间隔锁在 Redis 中的键前缀 */
const INTERVAL_KEY_PREFIX = 'sms:code:interval:';
const DEVELOPMENT_FIXED_CODE_PATTERN = /^\d{4,8}$/;
const COMPARE_AND_DELETE_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  end
  return 0
`;

/**
 * 短信验证码服务（业务无关的通用能力）。
 * 负责验证码的生成、Redis 存储与有效期、发送限流、以及校验消费；
 * 真正的发送动作委托给按配置选中的短信驱动（SmsResolver），与具体服务商解耦。
 */
@Injectable()
export class SmsCodeService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(SMS_RUNTIME_POLICY) private readonly runtime: SmsRuntimePolicy,
    private readonly config: ConfigService,
    private readonly resolver: SmsResolver,
  ) {}

  /**
   * 向手机号发送验证码。
   * 先原子领取发送间隔锁；发送或存储失败时只释放本请求持有的锁，修复后可重试。
   * @returns 本次发送对应的冷却秒数，供前端倒计时
   */
  async send(phone: string, scope: SmsCodeScope): Promise<number> {
    const interval = await this.config.getNumber(CONFIG_KEYS.sms.sendInterval, 60);
    const intervalKey = this.intervalKey(phone);
    const intervalToken = randomUUID();
    const claimed = await this.redis.set(intervalKey, intervalToken, 'EX', interval, 'NX');
    if (claimed !== 'OK') {
      const remaining = await this.redis.ttl(intervalKey);
      throw new BadRequestException(`发送过于频繁，请 ${remaining > 0 ? remaining : 1} 秒后再试`);
    }

    try {
      const fixedCode = await this.developmentFixedCode();
      const length = await this.config.getNumber(CONFIG_KEYS.sms.codeLength, 6);
      const codeTtl = await this.config.getNumber(CONFIG_KEYS.sms.codeTtl, 300);
      const code = fixedCode ?? this.generateCode(length);

      if (!fixedCode) {
        const port = await this.resolver.resolve();
        await port.sendCode({ phone, code });
      }

      await this.redis.set(this.codeKey(phone, scope, Boolean(fixedCode)), code, 'EX', codeTtl);
      return interval;
    } catch (error) {
      await this.compareAndDelete(intervalKey, intervalToken);
      throw error;
    }
  }

  /** 校验验证码：匹配成功即消费（删除），防止重复使用 */
  async verify(phone: string, code: string, scope: SmsCodeScope): Promise<boolean> {
    const fixedCode = await this.developmentFixedCode();
    const key = this.codeKey(phone, scope, Boolean(fixedCode));
    return (await this.compareAndDelete(key, code)) === 1;
  }

  /** 生成定长纯数字验证码（使用 CSPRNG，避免可预测） */
  private generateCode(length: number): string {
    const upperBound = 10 ** length;
    return randomInt(0, upperBound).toString().padStart(length, '0');
  }

  private async developmentFixedCode(): Promise<string | null> {
    if (!this.runtime.isDevelopment()) {
      return null;
    }
    const configured = (
      await this.config.getString(CONFIG_KEYS.sms.developmentFixedCode, '')
    ).trim();
    if (!configured) {
      return null;
    }
    if (!DEVELOPMENT_FIXED_CODE_PATTERN.test(configured)) {
      throw new InternalServerErrorException('开发短信固定验证码配置必须是 4 至 8 位数字');
    }
    return configured;
  }

  private codeKey(phone: string, scope: SmsCodeScope, fixed: boolean): string {
    const mode = fixed ? 'development-fixed' : 'standard';
    return `${CODE_KEY_PREFIX}${mode}:${scope.purpose}:${scope.tenantId}:${phone}`;
  }

  private intervalKey(phone: string): string {
    return `${INTERVAL_KEY_PREFIX}${phone}`;
  }

  private async compareAndDelete(key: string, expected: string): Promise<number> {
    const result = await this.redis.eval(COMPARE_AND_DELETE_SCRIPT, 1, key, expected);
    return Number(result);
  }
}
