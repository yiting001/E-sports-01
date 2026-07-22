import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { type INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CONFIG_KEYS, type TokenPair } from '@app/contracts';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../src/shared/redis/redis.constants';
import { ConfigService } from '../src/modules/config/application/config.service';
import { SmsCodeService } from '../src/modules/sms/application/sms-code.service';
import { SmsResolver } from '../src/modules/sms/application/sms.resolver';
import { SMS_RUNTIME_POLICY } from '../src/modules/sms/domain/sms-runtime-policy.interface';
import { TenantResolver } from '../src/modules/rbac/application/tenant-resolver.service';
import { TokenService } from '../src/modules/rbac/application/token.service';
import { SendLoginSmsCodeUseCase } from '../src/modules/rbac/application/use-cases/send-login-sms-code.usecase';
import { SmsLoginUseCase } from '../src/modules/rbac/application/use-cases/sms-login.usecase';
import { User, UserStatus } from '../src/modules/rbac/domain/user.entity';
import { USER_REPOSITORY } from '../src/modules/rbac/domain/user-repository.interface';
import { AuthSmsCodeController } from '../src/modules/rbac/interfaces/controllers/auth.sms-code.controller';
import { AuthSmsLoginController } from '../src/modules/rbac/interfaces/controllers/auth.sms-login.controller';

const PHONE = '18500000943';
const TENANT_ID = 'tenant-sms-http';
const USER_ID = 'user-sms-http';
const tokenPair: TokenPair = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresIn: 3600,
};

class MemoryRedis {
  private readonly values = new Map<string, string>();

  set(
    key: string,
    value: string,
    _expiryMode: 'EX',
    _seconds: number,
    setMode?: 'NX',
  ): Promise<'OK' | null> {
    if (setMode === 'NX' && this.values.has(key)) {
      return Promise.resolve(null);
    }
    this.values.set(key, value);
    return Promise.resolve('OK');
  }

  ttl(key: string): Promise<number> {
    return Promise.resolve(this.values.has(key) ? 60 : -2);
  }

  eval(_script: string, _keyCount: number, key: string, expected: string): Promise<number> {
    if (this.values.get(key) !== expected) {
      return Promise.resolve(0);
    }
    this.values.delete(key);
    return Promise.resolve(1);
  }
}

const user = Object.assign(new User(), {
  id: USER_ID,
  tenantId: TENANT_ID,
  username: 'sms_http_user',
  phone: PHONE,
  status: UserStatus.Enabled,
});

const userRepository = {
  findByPhone: (phone: string, tenantId?: string) =>
    Promise.resolve(phone === PHONE && tenantId === TENANT_ID ? user : null),
};

const configService = {
  getNumber: (key: string, fallback: number) => {
    const values = new Map<string, number>([
      [CONFIG_KEYS.sms.sendInterval, 60],
      [CONFIG_KEYS.sms.codeLength, 6],
      [CONFIG_KEYS.sms.codeTtl, 300],
    ]);
    return Promise.resolve(values.get(key) ?? fallback);
  },
  getString: (key: string, fallback: string) =>
    Promise.resolve(key === CONFIG_KEYS.sms.developmentFixedCode ? '000000' : fallback),
};

const tenantResolver = {
  resolveOptionalId: () => Promise.resolve(TENANT_ID),
  assertTenantEnabled: () => Promise.resolve(),
};

@Module({
  controllers: [AuthSmsCodeController, AuthSmsLoginController],
  providers: [
    SendLoginSmsCodeUseCase,
    SmsLoginUseCase,
    SmsCodeService,
    { provide: REDIS_CLIENT, useValue: new MemoryRedis() as unknown as Redis },
    {
      provide: SMS_RUNTIME_POLICY,
      useValue: { isDevelopment: () => true, isProduction: () => false },
    },
    { provide: ConfigService, useValue: configService },
    {
      provide: SmsResolver,
      useValue: { resolve: () => Promise.reject(new Error('固定码流程不应调用短信驱动')) },
    },
    { provide: USER_REPOSITORY, useValue: userRepository },
    { provide: TenantResolver, useValue: tenantResolver },
    { provide: TokenService, useValue: { issueTokenPair: () => Promise.resolve(tokenPair) } },
  ],
})
class SmsAuthHttpTestModule {}

let app: INestApplication;
let baseUrl = '';

before(async () => {
  app = await NestFactory.create(SmsAuthHttpTestModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  await app?.close();
});

test('开发固定码必须先发码，登录成功后不可重放', async () => {
  const withoutCode = await login();
  assert.equal(withoutCode.status, 401);

  const sent = await post('/auth/sms/code', { phone: PHONE });
  assert.equal(sent.status, 200);

  const loggedIn = await login();
  assert.equal(loggedIn.status, 200);
  const body: unknown = await loggedIn.json();
  assert.ok(isTokenPair(body));
  assert.equal(body.expiresIn, tokenPair.expiresIn);

  const replayed = await login();
  assert.equal(replayed.status, 401);
});

function login(): Promise<Response> {
  return post('/auth/sms/login', { phone: PHONE, code: '000000' });
}

function post(path: string, body: Record<string, string>): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function isTokenPair(value: unknown): value is TokenPair {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    'refreshToken' in value &&
    typeof value.refreshToken === 'string' &&
    'expiresIn' in value &&
    typeof value.expiresIn === 'number'
  );
}
