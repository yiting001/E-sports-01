import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantContext } from './tenant-context';

/**
 * 小程序端租户解析规则（无 window/地址栏）：
 * 场景参数 > 构建配置 VITE_TENANT_CODE > 本地持久化 > 默认租户。
 */
const storage = new Map<string, string>();

vi.mock('@/config/env', () => ({
  ENV: {
    // 动态读取，使 vi.stubEnv 对 VITE_TENANT_CODE 的修改能生效
    get tenantCode(): string {
      return import.meta.env.VITE_TENANT_CODE;
    },
  },
}));

function mockUni(): void {
  const holder = globalThis as {
    uni?: {
      getStorageSync: (key: string) => string;
      setStorageSync: (key: string, value: string) => void;
    };
  };
  holder.uni = {
    getStorageSync: (key) => storage.get(key) ?? '',
    setStorageSync: (key, value) => storage.set(key, value),
  };
}

describe('tenantContext.initialize', () => {
  beforeEach(() => {
    storage.clear();
    mockUni();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('无任何配置时回退默认租户', () => {
    tenantContext.initialize();
    expect(tenantContext.getCode()).toBe('default');
  });

  it('构建配置优先于本地持久化（避免串租户）', () => {
    storage.set('uni.tenantCode', 'stored-tenant');
    vi.stubEnv('VITE_TENANT_CODE', 'build-tenant');
    tenantContext.initialize();
    expect(tenantContext.getCode()).toBe('build-tenant');
  });

  it('场景参数覆盖构建配置并持久化', () => {
    storage.set('uni.tenantCode', 'stored-tenant');
    vi.stubEnv('VITE_TENANT_CODE', 'build-tenant');
    tenantContext.initialize('scan-tenant');
    expect(tenantContext.getCode()).toBe('scan-tenant');
    expect(storage.get('uni.tenantCode')).toBe('scan-tenant');
  });

  it('未设置构建配置时沿用持久化值', () => {
    storage.set('uni.tenantCode', 'stored-tenant');
    tenantContext.initialize();
    expect(tenantContext.getCode()).toBe('stored-tenant');
  });

  it('非法编码（含大写/超长/特殊字符）视为未提供', () => {
    vi.stubEnv('VITE_TENANT_CODE', 'BAD_TENANT!');
    tenantContext.initialize();
    expect(tenantContext.getCode()).toBe('default');
  });
});
