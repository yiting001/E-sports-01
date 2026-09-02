import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { MODULE_METADATA, PARAMTYPES_METADATA, SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import { RbacModule } from '../../src/modules/rbac/rbac.module';

type ClassLike = abstract new (...args: never[]) => unknown;
type SelfDeclaredDep = { index: number; param: unknown };

function isClass(value: unknown): value is ClassLike {
  return typeof value === 'function';
}

function collectClassProviders(): ClassLike[] {
  const providers: unknown = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, RbacModule);
  assert.ok(Array.isArray(providers), 'RbacModule 应声明 providers');
  const classes: ClassLike[] = [];
  for (const provider of providers) {
    if (isClass(provider)) {
      classes.push(provider);
    } else if (
      typeof provider === 'object' &&
      provider !== null &&
      'useClass' in provider &&
      isClass(provider.useClass)
    ) {
      classes.push(provider.useClass);
    }
  }
  return classes;
}

/**
 * 构造参数若以 Pick<>/接口等非类类型声明，TypeScript 只会把 design:paramtypes 记为 Object，
 * Nest 无法据此解析依赖，必须显式 @Inject(token)。此用例在启动前拦住这类漏标。
 */
test('RbacModule 内所有类 provider 的构造参数都能被 Nest 解析', () => {
  const classes = collectClassProviders();
  assert.ok(classes.length > 0);
  const problems: string[] = [];
  for (const cls of classes) {
    const paramTypes: unknown = Reflect.getMetadata(PARAMTYPES_METADATA, cls);
    if (!Array.isArray(paramTypes)) {
      continue;
    }
    const selfDeclared: unknown = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, cls);
    const injectedIndexes = new Set<number>(
      Array.isArray(selfDeclared)
        ? (selfDeclared as SelfDeclaredDep[]).map((dep) => dep.index)
        : [],
    );
    paramTypes.forEach((type: unknown, index) => {
      const resolvable = injectedIndexes.has(index) || (isClass(type) && type !== Object);
      if (!resolvable) {
        problems.push(`${cls.name} 第 ${index + 1} 个构造参数缺少 @Inject`);
      }
    });
  }
  assert.deepEqual(problems, []);
});
