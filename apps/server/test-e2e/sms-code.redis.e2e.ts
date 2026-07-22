import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { SmsProvider } from '@app/contracts';
import Redis from 'ioredis';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import type { ConfigService } from '../src/modules/config/application/config.service';
import { SmsCodeService } from '../src/modules/sms/application/sms-code.service';
import type { SmsResolver } from '../src/modules/sms/application/sms.resolver';
import { SmsCodePurpose, type SmsCodeScope } from '../src/modules/sms/domain/sms-code-scope';
import type { SmsPort } from '../src/modules/sms/domain/sms-port.interface';
import type { SmsRuntimePolicy } from '../src/modules/sms/domain/sms-runtime-policy.interface';

let redis: Redis;

before(() => {
  const env = loadEnvConfig();
  redis = new Redis({ host: env.redis.host, port: env.redis.port, maxRetriesPerRequest: 2 });
});

after(async () => {
  if (redis) {
    await redis.quit();
  }
});

test('真实 Redis 下发码与消费保持原子且验证码按用途隔离', async () => {
  const suffix = Date.now().toString().slice(-8);
  const phone = `199${suffix}`;
  const tenantId = randomUUID();
  const scope: SmsCodeScope = { purpose: SmsCodePurpose.Login, tenantId };
  const sentCodes: string[] = [];
  const port: SmsPort = {
    provider: SmsProvider.Aliyun,
    sendCode: ({ code }) => {
      sentCodes.push(code);
      return Promise.resolve();
    },
  };
  const resolver = { resolve: () => Promise.resolve(port) } as SmsResolver;
  const config = {
    getNumber: (key: string, fallback: number) => {
      const values = new Map<string, number>([
        ['sms.code.sendInterval', 30],
        ['sms.code.length', 6],
        ['sms.code.ttl', 30],
      ]);
      return Promise.resolve(values.get(key) ?? fallback);
    },
    getString: () => Promise.resolve(''),
  } as unknown as ConfigService;
  const runtime: SmsRuntimePolicy = {
    isDevelopment: () => true,
    isProduction: () => false,
  };
  const service = new SmsCodeService(redis, runtime, config, resolver);

  try {
    const sends = await Promise.allSettled([
      service.send(phone, scope),
      service.send(phone, scope),
    ]);
    assert.equal(sends.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(sentCodes.length, 1);
    const code = sentCodes[0] ?? '';
    assert.equal(
      await service.verify(phone, code, {
        purpose: SmsCodePurpose.Register,
        tenantId,
      }),
      false,
    );
    const verifies = await Promise.all([
      service.verify(phone, code, scope),
      service.verify(phone, code, scope),
    ]);
    assert.deepEqual(verifies.sort(), [false, true]);
  } finally {
    await redis.del(
      `sms:code:interval:${phone}`,
      `sms:code:standard:${SmsCodePurpose.Login}:${tenantId}:${phone}`,
      `sms:code:standard:${SmsCodePurpose.Register}:${tenantId}:${phone}`,
    );
  }
});
