import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
} from 'typeorm';
import { TenantContextService } from './tenant-context.service';

const TENANT_COLUMN = 'tenantId';

/**
 * 租户写入订阅器。
 * 在任意带 tenantId 列的实体插入前，自动用当前请求的 tenantId 回填，
 * 业务代码无需手写赋值；无上下文时不回填，交由列默认值落到默认租户。
 */
@Injectable()
export class TenantSubscriber implements EntitySubscriberInterface {
  constructor(
    dataSource: DataSource,
    private readonly tenant: TenantContextService,
  ) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    const hasTenantColumn = event.metadata.columns.some(
      (column) => column.propertyName === TENANT_COLUMN,
    );
    if (!hasTenantColumn || !event.entity) {
      return;
    }
    const tenantId = this.tenant.tenantId;
    const current = event.entity[TENANT_COLUMN];
    if (tenantId && (current === undefined || current === null || current === '')) {
      event.entity[TENANT_COLUMN] = tenantId;
    }
  }
}
