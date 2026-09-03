import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { MODULE_METADATA, PARAMTYPES_METADATA, SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../../src/app.module';

type ClassLike = abstract new (...args: never[]) => unknown;
type SelfDeclaredDep = { index: number; param: unknown };

function isClass(value: unknown): value is ClassLike {
  return typeof value === 'function';
}

/** 递归收集 AppModule 引用的全部静态模块类（DynamicModule 对象不含业务 provider，跳过） */
function collectModules(root: ClassLike, seen = new Set<ClassLike>()): ClassLike[] {
  if (seen.has(root)) {
    return [];
  }
  seen.add(root);
  const imports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, root);
  const modules: ClassLike[] = [root];
  if (Array.isArray(imports)) {
    for (const imported of imports) {
      if (isClass(imported)) {
        modules.push(...collectModules(imported, seen));
      }
    }
  }
  return modules;
}

function collectClassProviders(module: ClassLike): ClassLike[] {
  const providers: unknown = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module);
  if (!Array.isArray(providers)) {
    return [];
  }
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

/** 沿原型链找到真正声明构造函数（形参个数 > 0）的祖先，用于识别子类继承依赖却丢失元数据的情况 */
function inheritedConstructorArity(cls: ClassLike): number {
  let current: unknown = cls;
  while (isClass(current) && current !== Function.prototype) {
    if (current.length > 0) {
      return current.length;
    }
    current = Object.getPrototypeOf(current);
  }
  return 0;
}

function collectProblems(cls: ClassLike): string[] {
  const problems: string[] = [];
  const paramTypes: unknown = Reflect.getMetadata(PARAMTYPES_METADATA, cls);
  if (!Array.isArray(paramTypes)) {
    if (inheritedConstructorArity(cls) > 0) {
      problems.push(`${cls.name} 继承了带依赖的构造函数但没有 design:paramtypes，基类需加 @Injectable()`);
    }
    return problems;
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
  return problems;
}

/**
 * 两类只会在运行时（启动或首次调用）暴露的 DI 漏洞，在此提前拦截：
 * 1. 构造参数以 Pick<>/接口等非类类型声明，design:paramtypes 只记为 Object，Nest 无法解析，必须显式 @Inject(token)；
 * 2. @Injectable() 子类不声明构造函数、依赖全部来自未加装饰器的抽象基类，TypeScript 不会为基类产生
 *    design:paramtypes，Nest 会以零参数实例化，依赖字段为 undefined，首次调用时报 `reading 'xxx'`。
 */
test('AppModule 下所有类 provider 的构造参数都能被 Nest 解析', () => {
  const modules = collectModules(AppModule);
  const classes = modules.flatMap(collectClassProviders);
  assert.ok(classes.length > 0);
  const problems = classes.flatMap(collectProblems);
  assert.deepEqual(problems, []);
});
