import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/** 单次请求期间随上下文流动的租户信息 */
export interface TenantContext {
  /** 当前请求所属租户主键；公开/未认证请求为 null */
  tenantId: string | null;
  /** 是否平台超级管理员：为真则跨租户、不做行级过滤 */
  isSuper: boolean;
}

/**
 * 租户上下文服务。
 * 基于 AsyncLocalStorage 在一次异步调用链内透明传递 tenantId/isSuper，
 * 使仓储层无需层层传参即可做「写入回填、查询过滤」，实现行级数据隔离。
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  /** 在给定上下文中运行回调 */
  run<T>(context: TenantContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /** 鉴权完成后在当前上下文上补充租户信息 */
  set(tenantId: string | null, isSuper: boolean): void {
    const store = this.storage.getStore();
    if (store) {
      store.tenantId = tenantId;
      store.isSuper = isSuper;
    }
  }

  /** 当前租户 id（无上下文返回 null） */
  get tenantId(): string | null {
    return this.storage.getStore()?.tenantId ?? null;
  }

  /** 当前是否超管 */
  get isSuper(): boolean {
    return this.storage.getStore()?.isSuper ?? false;
  }

  /**
   * 取用于行级过滤的租户 id：
   * 返回 null 表示「不过滤」——超管、或无请求上下文（启动/播种等可信场景）。
   */
  scopeId(): string | null {
    const store = this.storage.getStore();
    if (!store || store.isSuper || !store.tenantId) {
      return null;
    }
    return store.tenantId;
  }
}
