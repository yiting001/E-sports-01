import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { ConversationMemberRole, MessageType } from '@app/contracts';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { MarkReadUseCase } from '../src/modules/im/application/use-cases/mark-read.usecase';
import { ConversationMemberEntity } from '../src/modules/im/domain/conversation-member.entity';
import { ChatMessageEntity } from '../src/modules/im/domain/message.entity';
import { TypeormConversationMemberRepository } from '../src/modules/im/infrastructure/conversation-member.repository';
import { TypeormMessageRepository } from '../src/modules/im/infrastructure/message.repository';
import { TenantContextService } from '../src/shared/tenant/tenant-context.service';

const TENANT_ID = 'tenant-im-read-e2e';
const USER_ID = 'user-im-read-e2e';
const CONVERSATION_ID = '00000000-0000-4000-8000-000000000101';
const schema = `im_read_e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`;

let adminDataSource: DataSource;
let dataSource: DataSource;
let tenant: TenantContextService;

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
    entities: [ChatMessageEntity, ConversationMemberEntity],
    synchronize: true,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  }).initialize();
  tenant = new TenantContextService();
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

test('PostgreSQL 微秒消息时间可被精确标记已读且未读数归零', async () => {
  const memberRepository = new TypeormConversationMemberRepository(
    dataSource.getRepository(ConversationMemberEntity),
    tenant,
  );
  const messageRepository = new TypeormMessageRepository(
    dataSource.getRepository(ChatMessageEntity),
    tenant,
  );
  const member = dataSource.getRepository(ConversationMemberEntity).create({
    tenantId: TENANT_ID,
    conversationId: CONVERSATION_ID,
    userId: USER_ID,
    role: ConversationMemberRole.Member,
    lastReadAt: null,
  });
  const savedMember = await dataSource.getRepository(ConversationMemberEntity).save(member);
  const message = dataSource.getRepository(ChatMessageEntity).create({
    tenantId: TENANT_ID,
    conversationId: CONVERSATION_ID,
    senderId: 'sender-im-read-e2e',
    type: MessageType.Text,
    content: '微秒已读验证',
    mentions: null,
    replyTo: null,
  });
  const savedMessage = await dataSource.getRepository(ChatMessageEntity).save(message);
  await dataSource.query(
    `UPDATE "${schema}"."sys_chat_message"
        SET created_at = '2026-07-22 05:12:51.863667+00'
      WHERE id = $1`,
    [savedMessage.id],
  );
  const useCase = new MarkReadUseCase(memberRepository, messageRepository);

  assert.equal(
    await inTenant(() => messageRepository.countUnread(CONVERSATION_ID, USER_ID)),
    1,
  );
  await inTenant(() => useCase.execute(CONVERSATION_ID, USER_ID, savedMessage.id));

  assert.equal(
    await inTenant(() => messageRepository.countUnread(CONVERSATION_ID, USER_ID)),
    0,
  );
  const [timestamps] = await dataSource.query(
    `SELECT to_char(last_read_at, 'YYYY-MM-DD HH24:MI:SS.US') AS cursor,
            to_char(message.created_at, 'YYYY-MM-DD HH24:MI:SS.US') AS message
       FROM "${schema}"."sys_conversation_member" member
       JOIN "${schema}"."sys_chat_message" message
         ON message."conversationId" = member.conversation_id
      WHERE member.id = $1 AND message.id = $2`,
    [savedMember.id, savedMessage.id],
  );
  assert.equal(timestamps.cursor, timestamps.message);
  assert.match(timestamps.cursor, /\.863667$/);
});

function inTenant<T>(work: () => Promise<T>): Promise<T> {
  return tenant.run({ tenantId: TENANT_ID, isSuper: false }, work);
}
