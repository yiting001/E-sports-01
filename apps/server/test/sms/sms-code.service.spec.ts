import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { CONFIG_KEYS, SmsProvider } from '@app/contracts';
import type Redis from 'ioredis';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import { SmsCodeService } from '../../src/modules/sms/application/sms-code.service';
import { SmsResolver } from '../../src/modules/sms/application/sms.resolver';
import { SmsCodePurpose, type SmsCodeScope } from '../../src/modules/sms/domain/sms-code-scope';
import type { SmsPort } from '../../src/modules/sms/domain/sms-port.interface';
import type { SmsRuntimePolicy } from '../../src/modules/sms/domain/sms-runtime-policy.interface';
import { LogSmsDriver } from '../../src/modules/sms/infrastructure/drivers/log-sms.driver';

const PHONE = '18500000942';
const LOGIN_SCOPE: SmsCodeScope = {
  purpose: SmsCodePurpose.Login,
  tenantId: 'tenant-a',
};

class MemoryRedis {
  private readonly values = new Map<string, string>();

  async set(
    key: string,
    value: string,
    _expiryMode: 'EX',
    _seconds: number,
    setMode?: 'NX',
  ): Promise<'OK' | null> {
    if (setMode === 'NX' && this.values.has(key)) {
      return null;
    }
    this.values.set(key, value);
    return 'OK';
  }

  async ttl(key: string): Promise<number> {
    return this.values.has(key) ? 60 : -2;
  }

  async eval(_script: string, _keyCount: number, key: string, expected: string): Promise<number> {
    if (this.values.get(key) !== expected) {
      return 0;
    }
    this.values.delete(key);
    return 1;
  }
}

class ConfigDouble {
  fixedCode = '000000';

  getNumber(key: string, fallback: number): Promise<number> {
    const values = new Map<string, number>([
      [CONFIG_KEYS.sms.sendInterval, 60],
      [CONFIG_KEYS.sms.codeLength, 6],
      [CONFIG_KEYS.sms.codeTtl, 300],
    ]);
    return Promise.resolve(values.get(key) ?? fallback);
  }

  getString(key: string, fallback: string): Promise<string> {
    if (key === CONFIG_KEYS.sms.developmentFixedCode) {
      return Promise.resolve(this.fixedCode);
    }
    return Promise.resolve(fallback);
  }
}

function runtime(development: boolean, production = false): SmsRuntimePolicy {
  return {
    isDevelopment: () => development,
    isProduction: () => production,
  };
}

function createService(options?: { development?: boolean; production?: boolean }): {
  service: SmsCodeService;
  config: ConfigDouble;
  redis: MemoryRedis;
  sentCodes: string[];
} {
  const redis = new MemoryRedis();
  const config = new ConfigDouble();
  const sentCodes: string[] = [];
  const port: SmsPort = {
    provider: SmsProvider.Aliyun,
    sendCode: ({ code }) => {
      sentCodes.push(code);
      return Promise.resolve();
    },
  };
  const resolver = {
    resolve: () => Promise.resolve(port),
  } as SmsResolver;
  const service = new SmsCodeService(
    redis as unknown as Redis,
    runtime(options?.development ?? true, options?.production ?? false),
    config as unknown as ConfigService,
    resolver,
  );
  return { service, config, redis, sentCodes };
}

test('development 固定码跳过短信驱动并保持一次性消费与作用域隔离', async () => {
  const { service, sentCodes } = createService();

  assert.equal(await service.send(PHONE, LOGIN_SCOPE), 60);
  assert.deepEqual(sentCodes, []);
  assert.equal(
    await service.verify(PHONE, '000000', {
      purpose: SmsCodePurpose.Register,
      tenantId: LOGIN_SCOPE.tenantId,
    }),
    false,
  );
  assert.equal(await service.verify(PHONE, '000000', LOGIN_SCOPE), true);
  assert.equal(await service.verify(PHONE, '000000', LOGIN_SCOPE), false);
});

test('development 清空固定码后恢复真实驱动与随机验证码流程', async () => {
  const { service, config, sentCodes } = createService();
  config.fixedCode = '';

  await service.send(PHONE, LOGIN_SCOPE);

  assert.equal(sentCodes.length, 1);
  assert.match(sentCodes[0] ?? '', /^\d{6}$/);
  assert.equal(await service.verify(PHONE, sentCodes[0] ?? '', LOGIN_SCOPE), true);
});

test('production 无条件忽略固定码配置并走真实短信驱动', async () => {
  const { service, sentCodes } = createService({ development: false, production: true });

  await service.send(PHONE, LOGIN_SCOPE);

  assert.equal(sentCodes.length, 1);
  assert.equal(await service.verify(PHONE, sentCodes[0] ?? '', LOGIN_SCOPE), true);
});

test('非法固定码明确失败并释放发送锁以允许修复后重试', async () => {
  const { service, config } = createService();
  config.fixedCode = 'invalid';
  await assert.rejects(
    service.send(PHONE, LOGIN_SCOPE),
    (error: unknown) => error instanceof InternalServerErrorException,
  );

  config.fixedCode = '000000';
  assert.equal(await service.send(PHONE, LOGIN_SCOPE), 60);
});

test('同一手机号并发发码只有一个请求取得冷却锁', async () => {
  const { service } = createService();
  const results = await Promise.allSettled([
    service.send(PHONE, LOGIN_SCOPE),
    service.send(PHONE, LOGIN_SCOPE),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(rejected?.status === 'rejected' && rejected.reason instanceof BadRequestException);
});

test('production 禁止选择日志短信驱动', async () => {
  const logPort: SmsPort = {
    provider: SmsProvider.Log,
    sendCode: () => Promise.resolve(),
  };
  const config = {
    getString: () => Promise.resolve(SmsProvider.Log),
  } as unknown as ConfigService;
  const resolver = new SmsResolver([logPort], runtime(false, true), config);

  await assert.rejects(
    resolver.resolve(),
    (error: unknown) => error instanceof InternalServerErrorException,
  );
});

test('development 关闭固定码后拒绝无交付能力的日志短信驱动', async () => {
  const logPort: SmsPort = {
    provider: SmsProvider.Log,
    sendCode: () => Promise.resolve(),
  };
  const config = {
    getString: () => Promise.resolve(SmsProvider.Log),
  } as unknown as ConfigService;
  const resolver = new SmsResolver([logPort], runtime(true), config);

  await assert.rejects(
    resolver.resolve(),
    (error: unknown) => error instanceof InternalServerErrorException,
  );
});

test('日志驱动不记录完整手机号或验证码', async (t) => {
  const messages: string[] = [];
  t.mock.method(Logger.prototype, 'log', (message: unknown) => {
    messages.push(String(message));
  });
  const driver = new LogSmsDriver();

  await driver.sendCode({ phone: PHONE, code: '123456' });

  assert.equal(messages.length, 1);
  assert.doesNotMatch(messages[0] ?? '', new RegExp(PHONE));
  assert.doesNotMatch(messages[0] ?? '', /123456/);
  assert.match(messages[0] ?? '', /185\*{4}0942/);
});
