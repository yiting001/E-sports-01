import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/api/token-storage';
import {
  TenantEntryStatus,
  extractTenantQuery,
  resolveTenantEntry,
  tenantContext,
} from './tenant-context';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  tenantContext.setCode('reset-tenant');
  tenantContext.setCode('default');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('C 端租户上下文', () => {
  it('从 hash 路由 query 提取租户参数，兼容旧 search 参数', () => {
    expect(extractTenantQuery('', '#/?tenantCode=hash-tenant')).toBe(
      'tenantCode=hash-tenant'
    );
    expect(
      extractTenantQuery('?tenantCode=search-tenant', '#/')
    ).toBe('?tenantCode=search-tenant');
    expect(extractTenantQuery('?other=1', '#/home?tenantCode=hash-tenant')).toBe(
      'tenantCode=hash-tenant'
    );
    expect(extractTenantQuery('', '#/')).toBe('');
  });

  it('按 URL、会话存储、默认租户的顺序解析', () => {
    expect(
      resolveTenantEntry('?tenantCode=url-tenant', 'stored-tenant')
    ).toEqual({
      code: 'url-tenant',
      error: null,
    });
    expect(resolveTenantEntry('', 'stored-tenant')).toEqual({
      code: 'stored-tenant',
      error: null,
    });
    expect(resolveTenantEntry('', null)).toEqual({
      code: 'default',
      error: null,
    });
  });

  it('显式 URL 租户编码无效或重复时关闭入口，不能回退已有租户', () => {
    expect(resolveTenantEntry('?tenantCode=', 'stored-tenant').error).toContain(
      '租户地址无效'
    );
    expect(
      resolveTenantEntry('?tenantCode=bad!', 'stored-tenant').error
    ).toContain('租户地址无效');
    expect(
      resolveTenantEntry(
        '?tenantCode=tenant-one&tenantCode=tenant-two',
        'stored-tenant'
      ).error
    ).toContain('租户地址无效');
  });

  it('按租户隔离同源浏览器中的令牌', () => {
    tenantContext.setCode('tenant-one');
    tokenStorage.save({
      accessToken: 'access-one',
      refreshToken: 'refresh-one',
    });

    tenantContext.setCode('tenant-two');
    expect(tokenStorage.getAccess()).toBeNull();
    tokenStorage.save({
      accessToken: 'access-two',
      refreshToken: 'refresh-two',
    });

    tenantContext.setCode('tenant-one');
    expect(tokenStorage.getAccess()).toBe('access-one');
    expect(tokenStorage.getRefresh()).toBe('refresh-one');
  });

  it('合法租户入口按 validating、ready、rejected 流转', () => {
    tenantContext.setCode('tenant-one');
    const validatingRevision = tenantContext.revision.value;

    expect(tenantContext.entryStatus.value).toBe(
      TenantEntryStatus.Validating
    );
    expect(
      tenantContext.markReady('tenant-one', validatingRevision)
    ).toBe(true);
    expect(tenantContext.entryStatus.value).toBe(TenantEntryStatus.Ready);

    expect(
      tenantContext.rejectCurrent('tenant-one', validatingRevision)
    ).toBe(true);
    expect(tenantContext.entryStatus.value).toBe(TenantEntryStatus.Rejected);
    expect(tenantContext.entryError.value).toContain('租户不存在或已停用');
    expect(tenantContext.markReady('tenant-one', validatingRevision)).toBe(
      false
    );
  });
});
