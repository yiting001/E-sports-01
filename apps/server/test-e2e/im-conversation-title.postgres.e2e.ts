import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { ConversationStatus, ConversationType } from '@app/contracts';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { ConversationEntity } from '../src/modules/im/domain/conversation.entity';
import { TypeormConversationRepository } from '../src/modules/im/infrastructure/conversation.repository';
import { TenantContextService } from '../src/shared/tenant/tenant-context.service';

const TENANT_ID = 'tenant-im-title-e2e';
const OTHER_TENANT_ID = 'tenant-im-title-other';
const schema = `im_title_e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`;

let adminDataSource: DataSource;
let dataSource: DataSource;
let tenant: TenantContextService;
let repository: TypeormConversationRepository;

before(async () => {
  const env = loadEnvConfig();
  const connection = {
    type: 'postgres' as const,
    host: env.database.host,
    port: env.database.port,
    username: env.database.user,
    password: env.database.password,
    database: env.database.name,
  };
  adminDataSource = await new DataSource(connection).initialize();
  await adminDataSource.query(`CREATE SCHEMA "${schema}"`);
  dataSource = await new DataSource({
    ...connection,
    schema,
    entities: [ConversationEntity],
    synchronize: true,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  }).initialize();
  tenant = new TenantContextService();
  repository = new TypeormConversationRepository(
    dataSource.getRepository(ConversationEntity),
    tenant,
  );
});

after(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  if (adminDataSource?.isInitialized) {
    await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminDataSource.destroy();
  }
});

test('PostgreSQL 会话标题 CAS 仅允许一个竞争者成功并保持租户隔离', async () => {
  const conversation = await createConversation(TENANT_ID, '[待接单] 订单群·陪玩服务');
  const wrongExpected = await inTenant(TENANT_ID, () =>
    repository.compareAndSetTitle(
      conversation.id,
      conversation.version + 1,
      '[服务中] 订单群·陪玩服务',
    ),
  );
  assert.equal(wrongExpected, null);

  const [serving, completed] = await inTenant(TENANT_ID, () =>
    Promise.all([
      repository.compareAndSetTitle(
        conversation.id,
        conversation.version,
        '[服务中] 订单群·陪玩服务',
      ),
      repository.compareAndSetTitle(
        conversation.id,
        conversation.version,
        '[已结束] 订单群·陪玩服务',
      ),
    ]),
  );
  assert.equal([serving, completed].filter(Boolean).length, 1);

  const persisted = await inTenant(TENANT_ID, () => repository.findById(conversation.id));
  assert.ok(persisted);
  assert.ok(
    ['[服务中] 订单群·陪玩服务', '[已结束] 订单群·陪玩服务'].includes(persisted.title),
  );

  const crossTenant = await inTenant(OTHER_TENANT_ID, () =>
    repository.compareAndSetTitle(
      conversation.id,
      persisted.version,
      '[已结束] 越权标题',
    ),
  );
  assert.equal(crossTenant, null);
  const afterCrossTenant = await inTenant(TENANT_ID, () => repository.findById(conversation.id));
  assert.equal(afterCrossTenant?.title, persisted.title);
});

async function createConversation(tenantId: string, title: string): Promise<ConversationEntity> {
  const conversation = dataSource.getRepository(ConversationEntity).create({
    tenantId,
    type: ConversationType.Group,
    title,
    ownerId: 'owner-im-title-e2e',
    status: ConversationStatus.Active,
    subject: '',
  });
  return dataSource.getRepository(ConversationEntity).save(conversation);
}

function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return tenant.run({ tenantId, isSuper: false }, work);
}
