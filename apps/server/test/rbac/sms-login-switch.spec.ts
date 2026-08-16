import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '../../src/modules/config/application/config.service';
import { SendLoginSmsCodeUseCase } from '../../src/modules/rbac/application/use-cases/send-login-sms-code.usecase';
import { SendRegisterSmsCodeUseCase } from '../../src/modules/rbac/application/use-cases/send-register-sms-code.usecase';
import { SmsLoginUseCase } from '../../src/modules/rbac/application/use-cases/sms-login.usecase';
import { SmsRegisterUseCase } from '../../src/modules/rbac/application/use-cases/sms-register.usecase';

/** 关闭短信登录注册开关的配置读取桩：其余依赖不应被触达 */
const disabledConfig = {
  getBoolean: async () => false,
} as unknown as ConfigService;

/** 任何后续依赖被调用即视为越过开关守卫，直接失败 */
function untouched<T>(name: string): T {
  return new Proxy(
    {},
    {
      get: () => () => {
        throw new Error(`开关关闭时不应访问依赖 ${name}`);
      },
    },
  ) as T;
}

test('短信登录开关关闭时发送登录验证码被拒绝', async () => {
  const useCase = new SendLoginSmsCodeUseCase(
    untouched('userRepo'),
    disabledConfig,
    untouched('smsCode'),
    untouched('tenants'),
  );
  await assert.rejects(useCase.execute('13800000000'), ForbiddenException);
});

test('短信登录开关关闭时发送注册验证码被拒绝', async () => {
  const useCase = new SendRegisterSmsCodeUseCase(
    untouched('userRepo'),
    disabledConfig,
    untouched('smsCode'),
    untouched('tenants'),
  );
  await assert.rejects(useCase.execute('13800000000'), ForbiddenException);
});

test('短信登录开关关闭时短信登录被拒绝', async () => {
  const useCase = new SmsLoginUseCase(
    untouched('userRepo'),
    disabledConfig,
    untouched('smsCode'),
    untouched('token'),
    untouched('tenants'),
  );
  await assert.rejects(
    useCase.execute({ phone: '13800000000', code: '123456' }),
    ForbiddenException,
  );
});

test('短信登录开关关闭时短信注册被拒绝', async () => {
  const useCase = new SmsRegisterUseCase(
    untouched('userRepo'),
    untouched('roleRepo'),
    disabledConfig,
    untouched('smsCode'),
    untouched('password'),
    untouched('token'),
    untouched('tenants'),
  );
  await assert.rejects(
    useCase.execute({ phone: '13800000000', code: '123456' }),
    ForbiddenException,
  );
});
