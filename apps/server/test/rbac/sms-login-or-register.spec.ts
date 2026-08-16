import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '../../src/modules/config/application/config.service';
import { PhoneMemberRegistrar } from '../../src/modules/rbac/application/phone-member-registrar.service';
import { TenantResolver } from '../../src/modules/rbac/application/tenant-resolver.service';
import { TokenService } from '../../src/modules/rbac/application/token.service';
import { SendLoginSmsCodeUseCase } from '../../src/modules/rbac/application/use-cases/send-login-sms-code.usecase';
import { SmsLoginUseCase } from '../../src/modules/rbac/application/use-cases/sms-login.usecase';
import { UserRepository } from '../../src/modules/rbac/domain/user-repository.interface';
import { User, UserStatus } from '../../src/modules/rbac/domain/user.entity';
import { SmsCodeService } from '../../src/modules/sms/application/sms-code.service';

const TENANT_ID = 'tenant-1';

/** 开启短信登录开关的配置读取桩 */
const enabledConfig = {
  getBoolean: async () => true,
} as unknown as ConfigService;

const tenantsStub = {
  resolveOptionalId: async () => TENANT_ID,
  resolveForWrite: async () => TENANT_ID,
  assertTenantEnabled: async () => undefined,
} as unknown as TenantResolver;

const tokenStub = {
  issueTokenPair: async (id: string, username: string) => ({
    accessToken: `at-${id}-${username}`,
    refreshToken: 'rt',
    expiresIn: 3600,
  }),
} as unknown as TokenService;

function userStub(status: UserStatus): User {
  return {
    id: 'user-1',
    username: 'sms_13800000000',
    status,
    tenantId: TENANT_ID,
  } as User;
}

function untouched<T>(name: string): T {
  return new Proxy(
    {},
    {
      get: () => () => {
        throw new Error(`不应访问依赖 ${name}`);
      },
    },
  ) as T;
}

test('短信登录：已注册启用账号直接登录且不触发注册', async () => {
  const useCase = new SmsLoginUseCase(
    { findByPhone: async () => userStub(UserStatus.Enabled) } as unknown as UserRepository,
    enabledConfig,
    { verify: async () => true } as unknown as SmsCodeService,
    tokenStub,
    tenantsStub,
    untouched<PhoneMemberRegistrar>('registrar'),
  );

  const result = await useCase.execute({ phone: '13800000000', code: '123456' });

  assert.equal(result.registered, false);
  assert.equal(result.accessToken, 'at-user-1-sms_13800000000');
});

test('短信登录：未注册手机号验证通过后自动注册并标记 registered', async () => {
  let registeredPhone = '';
  const registrar = {
    register: async (phone: string, tenantId: string) => {
      registeredPhone = phone;
      return { ...userStub(UserStatus.Enabled), id: 'user-new', tenantId } as User;
    },
  } as unknown as PhoneMemberRegistrar;
  const useCase = new SmsLoginUseCase(
    { findByPhone: async () => null } as unknown as UserRepository,
    enabledConfig,
    { verify: async () => true } as unknown as SmsCodeService,
    tokenStub,
    tenantsStub,
    registrar,
  );

  const result = await useCase.execute({ phone: '13800000000', code: '123456' });

  assert.equal(result.registered, true);
  assert.equal(registeredPhone, '13800000000');
});

test('短信登录：已注册但被禁用的账号拒绝登录', async () => {
  const useCase = new SmsLoginUseCase(
    { findByPhone: async () => userStub(UserStatus.Disabled) } as unknown as UserRepository,
    enabledConfig,
    untouched<SmsCodeService>('smsCode'),
    untouched<TokenService>('token'),
    tenantsStub,
    untouched<PhoneMemberRegistrar>('registrar'),
  );

  await assert.rejects(
    useCase.execute({ phone: '13800000000', code: '123456' }),
    UnauthorizedException,
  );
});

test('短信登录：验证码错误时拒绝且不注册', async () => {
  const useCase = new SmsLoginUseCase(
    { findByPhone: async () => null } as unknown as UserRepository,
    enabledConfig,
    { verify: async () => false } as unknown as SmsCodeService,
    untouched<TokenService>('token'),
    tenantsStub,
    untouched<PhoneMemberRegistrar>('registrar'),
  );

  await assert.rejects(
    useCase.execute({ phone: '13800000000', code: '000000' }),
    UnauthorizedException,
  );
});

test('发送登录验证码：未注册手机号也可发码（登录注册合一）', async () => {
  const useCase = new SendLoginSmsCodeUseCase(
    { findByPhone: async () => null } as unknown as UserRepository,
    enabledConfig,
    { send: async () => 60 } as unknown as SmsCodeService,
    tenantsStub,
  );

  const result = await useCase.execute('13800000000');

  assert.deepEqual(result, { cooldown: 60 });
});

test('发送登录验证码：已绑定但被禁用的账号拒绝发码', async () => {
  const useCase = new SendLoginSmsCodeUseCase(
    { findByPhone: async () => userStub(UserStatus.Disabled) } as unknown as UserRepository,
    enabledConfig,
    untouched<SmsCodeService>('smsCode'),
    tenantsStub,
  );

  await assert.rejects(useCase.execute('13800000000'), UnauthorizedException);
});
