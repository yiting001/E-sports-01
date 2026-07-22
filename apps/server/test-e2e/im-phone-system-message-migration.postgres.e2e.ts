import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { DataSource, type QueryRunner } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { RedactImPhoneSystemMessages1784736300000 } from '../src/database/migrations/1784736300000-redact-im-phone-system-messages';

const schema = `im_phone_message_migration_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
let adminDataSource: DataSource;
let dataSource: DataSource;
let runner: QueryRunner;

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
  dataSource = await new DataSource(connection).initialize();
  runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.query(`SET search_path TO "${schema}"`);
  await runner.query(`
    CREATE TABLE "service_order" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenant_id" varchar(36) NOT NULL,
      "conversation_id" varchar(64) NOT NULL,
      "booster_id" varchar(36) NOT NULL DEFAULT '',
      "booster_name" varchar(64) NOT NULL DEFAULT ''
    )
  `);
  await runner.query(`
    CREATE TABLE "sys_chat_message" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "version" integer NOT NULL DEFAULT 1,
      "tenant_id" varchar(36) NOT NULL,
      "conversationId" varchar(64) NOT NULL,
      "senderId" varchar(36) NOT NULL,
      "type" varchar(16) NOT NULL,
      "content" text NOT NULL,
      "reply_to" jsonb
    )
  `);
  await runner.query(`
    CREATE TABLE "sys_conversation" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "version" integer NOT NULL DEFAULT 1,
      "tenant_id" varchar(36) NOT NULL,
      "title" varchar(128) NOT NULL
    )
  `);
  await runner.query(`
    CREATE TABLE "rbac_user" (
      "id" uuid PRIMARY KEY,
      "tenant_id" varchar(36) NOT NULL,
      "nickname" varchar(64) NOT NULL DEFAULT ''
    )
  `);
});

after(async () => {
  if (runner?.isReleased === false) {
    await runner.release();
  }
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  if (adminDataSource?.isInitialized) {
    await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminDataSource.destroy();
  }
});

test('历史接单提示使用同租户订单中的打手显示名替换手机号用户名', async () => {
  const migration = new RedactImPhoneSystemMessages1784736300000();
  const messageId = randomUUID();
  const boosterId = '00000000-0000-4000-8000-000000000941';
  await runner.query(
    `INSERT INTO "rbac_user" ("id", "tenant_id", "nickname")
     VALUES ($1, 'tenant-a', '当前昵称')`,
    [boosterId],
  );
  await runner.query(
    `INSERT INTO "service_order" (
       "tenant_id", "conversation_id", "booster_id", "booster_name"
     ) VALUES ($1, $2, $3, $4)`,
    ['tenant-a', 'conversation-a', boosterId, '闪电'],
  );
  await runner.query(
    `INSERT INTO "sys_chat_message" (
       "id", "tenant_id", "conversationId", "senderId", "type", "content"
     ) VALUES ($1, $2, $3, 'system', 'system', $4)`,
    [messageId, 'tenant-a', 'conversation-a', '打手 sms_18500000942 已接单，加入群聊为您服务'],
  );

  await migration.up(runner);

  const [message] = (await runner.query(
    `SELECT "content" FROM "sys_chat_message" WHERE "id" = $1`,
    [messageId],
  )) as Array<{ content: string }>;
  assert.equal(message?.content, '打手 闪电 已接单，加入群聊为您服务');
});

test('历史接单提示使用同租户打手资料并把动态昵称编码为纯文本', async () => {
  const migration = new RedactImPhoneSystemMessages1784736300000();
  const messageId = randomUUID();
  const previouslyRedactedMessageId = randomUUID();
  const boosterId = '00000000-0000-4000-8000-000000000942';
  await runner.query(
    `INSERT INTO "rbac_user" ("id", "tenant_id", "nickname")
     VALUES ($1, 'tenant-a', $2)`,
    [boosterId, '星河<img src="https://attacker.invalid/pixel">'],
  );
  await runner.query(
    `INSERT INTO "service_order" (
       "tenant_id", "conversation_id", "booster_id", "booster_name"
     ) VALUES ('tenant-a', 'conversation-profile-name', $1, '')`,
    [boosterId],
  );
  await runner.query(
    `INSERT INTO "sys_chat_message" (
       "id", "tenant_id", "conversationId", "senderId", "type", "content"
     ) VALUES
       ($1, 'tenant-a', 'conversation-profile-name', 'system', 'system', $3),
       ($2, 'tenant-a', 'conversation-profile-name', 'system', 'system', $4)`,
    [
      messageId,
      previouslyRedactedMessageId,
      '打手 sms_18500000942 已接单，加入群聊为您服务',
      '打手已接单，加入群聊为您服务',
    ],
  );

  await migration.up(runner);

  const messages = (await runner.query(
    `SELECT "id", "content"
     FROM "sys_chat_message"
     WHERE "id" = ANY($1::uuid[])`,
    [[messageId, previouslyRedactedMessageId]],
  )) as Array<{ id: string; content: string }>;
  const contents = new Map(messages.map((message) => [message.id, message.content]));
  const expected =
    '打手 星河&lt;img src=&quot;https://attacker.invalid/pixel&quot;&gt; 已接单，加入群聊为您服务';
  assert.equal(contents.get(messageId), expected);
  assert.equal(contents.get(previouslyRedactedMessageId), expected);
});

test('历史接单提示缺少同租户安全名称时统一移除身份信息', async () => {
  const migration = new RedactImPhoneSystemMessages1784736300000();
  const emptyNameMessageId = randomUUID();
  const sensitiveNameMessageId = randomUUID();
  const crossTenantMessageId = randomUUID();
  const missingOrderMessageId = randomUUID();
  await runner.query(
    `INSERT INTO "service_order" ("tenant_id", "conversation_id", "booster_name")
     VALUES
       ('tenant-a', 'conversation-empty-name', ''),
       ('tenant-a', 'conversation-sensitive-name', '18500000942'),
       ('tenant-b', 'conversation-cross-tenant', '不可跨租户使用')`,
  );
  await runner.query(
    `INSERT INTO "sys_chat_message" (
       "id", "tenant_id", "conversationId", "senderId", "type", "content"
     ) VALUES
       ($1, 'tenant-a', 'conversation-empty-name', 'system', 'system', $5),
       ($2, 'tenant-a', 'conversation-sensitive-name', 'system', 'system', $5),
       ($3, 'tenant-a', 'conversation-cross-tenant', 'system', 'system', $5),
       ($4, 'tenant-a', 'conversation-missing-order', 'system', 'system', $5)`,
    [
      emptyNameMessageId,
      sensitiveNameMessageId,
      crossTenantMessageId,
      missingOrderMessageId,
      '打手 sms_18600000943 已接单，加入群聊为您服务',
    ],
  );

  await migration.up(runner);

  const rows = (await runner.query(
    `SELECT "id", "content"
     FROM "sys_chat_message"
     WHERE "id" = ANY($1::uuid[])`,
    [[emptyNameMessageId, sensitiveNameMessageId, crossTenantMessageId, missingOrderMessageId]],
  )) as Array<{ id: string; content: string }>;
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.equal(row.content, '打手已接单，加入群聊为您服务');
  }
});

test('历史接单提示使用安全编号回退且重复执行不产生空更新', async () => {
  const migration = new RedactImPhoneSystemMessages1784736300000();
  const fallbackMessageId = randomUUID();
  const unresolvedMessageId = randomUUID();
  const sensitiveBoosterId = '10000000-0000-4000-8000-00000000c3d4';
  const crossTenantBoosterId = '10000000-0000-4000-8000-00000000e5f6';
  await runner.query(
    `INSERT INTO "rbac_user" ("id", "tenant_id", "nickname")
     VALUES
       ($1, 'tenant-a', 'sms_18500000942'),
       ($2, 'tenant-b', '其他租户昵称')`,
    [sensitiveBoosterId, crossTenantBoosterId],
  );
  await runner.query(
    `INSERT INTO "service_order" (
       "tenant_id", "conversation_id", "booster_id", "booster_name"
     ) VALUES
       ('tenant-a', 'conversation-sensitive-profile', $1, '18600000943'),
       ('tenant-a', 'conversation-unresolved-profile', $2, '')`,
    [sensitiveBoosterId, crossTenantBoosterId],
  );
  await runner.query(
    `INSERT INTO "sys_chat_message" (
       "id", "tenant_id", "conversationId", "senderId", "type", "content"
     ) VALUES
       ($1, 'tenant-a', 'conversation-sensitive-profile', 'system', 'system', $3),
       ($2, 'tenant-a', 'conversation-unresolved-profile', 'system', 'system', $3)`,
    [fallbackMessageId, unresolvedMessageId, '打手已接单，加入群聊为您服务'],
  );

  await migration.up(runner);
  const firstRows = (await runner.query(
    `SELECT "id", "content", "version", "updated_at"::text AS "updatedAt"
     FROM "sys_chat_message"
     WHERE "id" = ANY($1::uuid[])`,
    [[fallbackMessageId, unresolvedMessageId]],
  )) as Array<{ id: string; content: string; version: number; updatedAt: string }>;
  await runner.query('SELECT pg_sleep(0.02)');
  await migration.up(runner);
  const secondRows = (await runner.query(
    `SELECT "id", "content", "version", "updated_at"::text AS "updatedAt"
     FROM "sys_chat_message"
     WHERE "id" = ANY($1::uuid[])`,
    [[fallbackMessageId, unresolvedMessageId]],
  )) as Array<{ id: string; content: string; version: number; updatedAt: string }>;

  const firstById = new Map(firstRows.map((message) => [message.id, message]));
  const secondById = new Map(secondRows.map((message) => [message.id, message]));
  assert.equal(
    firstById.get(fallbackMessageId)?.content,
    '打手 用户00C3D4 已接单，加入群聊为您服务',
  );
  assert.equal(firstById.get(unresolvedMessageId)?.content, '打手已接单，加入群聊为您服务');
  assert.deepEqual(secondById.get(fallbackMessageId), firstById.get(fallbackMessageId));
  assert.deepEqual(secondById.get(unresolvedMessageId), firstById.get(unresolvedMessageId));
});

test('带旧随机后缀的手机号用户名仍使用订单打手显示名替换', async () => {
  const migration = new RedactImPhoneSystemMessages1784736300000();
  const messageId = randomUUID();
  await runner.query(
    `INSERT INTO "service_order" ("tenant_id", "conversation_id", "booster_name")
     VALUES ('tenant-a', 'conversation-suffixed-name', '夜风')`,
  );
  await runner.query(
    `INSERT INTO "sys_chat_message" (
       "id", "tenant_id", "conversationId", "senderId", "type", "content"
     ) VALUES ($1, 'tenant-a', 'conversation-suffixed-name', 'system', 'system', $2)`,
    [messageId, '打手 sms_18700000944_a1b2 已接单，加入群聊为您服务'],
  );

  await migration.up(runner);

  const [message] = (await runner.query(
    `SELECT "content" FROM "sys_chat_message" WHERE "id" = $1`,
    [messageId],
  )) as Array<{ content: string }>;
  assert.equal(message?.content, '打手 夜风 已接单，加入群聊为您服务');
});

test('消息正文与会话标题只替换精确的手机号派生账号 token', async () => {
  const migration = new RedactImPhoneSystemMessages1784736300000();
  const redactedMessageId = randomUUID();
  const ordinaryMessageId = randomUUID();
  const nonSystemOrderNoticeId = randomUUID();
  const redactedConversationId = randomUUID();
  const ordinaryConversationId = randomUUID();
  const ordinaryContent =
    '普通文本 sms_12800000945 sms_188000009450 sms_18800000945_extra xsms_18800000945';
  await runner.query(
    `INSERT INTO "sys_chat_message" (
       "id", "tenant_id", "conversationId", "senderId", "type", "content"
     ) VALUES
       ($1, 'tenant-a', 'conversation-global-message', 'user-a', 'text', $3),
       ($2, 'tenant-a', 'conversation-ordinary-message', 'user-a', 'text', $4)`,
    [
      redactedMessageId,
      ordinaryMessageId,
      'sms_18800000945 加入群聊，回复 sms_18900000946_c0de',
      ordinaryContent,
    ],
  );
  await runner.query(
    `INSERT INTO "service_order" ("tenant_id", "conversation_id", "booster_name")
     VALUES ('tenant-a', 'conversation-non-system-notice', '不应用于普通消息')`,
  );
  await runner.query(
    `INSERT INTO "sys_chat_message" (
       "id", "tenant_id", "conversationId", "senderId", "type", "content"
     ) VALUES ($1, 'tenant-a', 'conversation-non-system-notice', 'user-a', 'text', $2)`,
    [nonSystemOrderNoticeId, '打手 sms_18800000945 已接单，加入群聊为您服务'],
  );
  await runner.query(
    `INSERT INTO "sys_conversation" ("id", "tenant_id", "title")
     VALUES
       ($1, 'tenant-a', '客服 · sms_18800000945'),
       ($2, 'tenant-a', '普通会话 sms_18800000945_a1b2x')`,
    [redactedConversationId, ordinaryConversationId],
  );

  await migration.up(runner);

  const messages = (await runner.query(
    `SELECT "id", "content" FROM "sys_chat_message" WHERE "id" = ANY($1::uuid[])`,
    [[redactedMessageId, ordinaryMessageId, nonSystemOrderNoticeId]],
  )) as Array<{ id: string; content: string }>;
  const messageContents = new Map(messages.map((message) => [message.id, message.content]));
  assert.equal(messageContents.get(redactedMessageId), '成员 加入群聊，回复 成员');
  assert.equal(messageContents.get(ordinaryMessageId), ordinaryContent);
  assert.equal(messageContents.get(nonSystemOrderNoticeId), '打手 成员 已接单，加入群聊为您服务');

  const conversations = (await runner.query(
    `SELECT "id", "title" FROM "sys_conversation" WHERE "id" = ANY($1::uuid[])`,
    [[redactedConversationId, ordinaryConversationId]],
  )) as Array<{ id: string; title: string }>;
  const conversationTitles = new Map(
    conversations.map((conversation) => [conversation.id, conversation.title]),
  );
  assert.equal(conversationTitles.get(redactedConversationId), '客服 · 成员');
  assert.equal(conversationTitles.get(ordinaryConversationId), '普通会话 sms_18800000945_a1b2x');
});

test('引用快照按同租户用户资料替换手机号用户名且不改其他字段', async () => {
  const migration = new RedactImPhoneSystemMessages1784736300000();
  const namedUserId = '00000000-0000-4000-8000-00000000a1b2';
  const unnamedUserId = '00000000-0000-4000-8000-00000000c3d4';
  const crossTenantUserId = '00000000-0000-4000-8000-00000000e5f6';
  const sensitiveNameUserId = '00000000-0000-4000-8000-00000000f7a8';
  const namedMessageId = randomUUID();
  const unnamedMessageId = randomUUID();
  const crossTenantMessageId = randomUUID();
  const sensitiveNameMessageId = randomUUID();
  const missingUserMessageId = randomUUID();
  const ordinaryMessageId = randomUUID();
  await runner.query(
    `INSERT INTO "rbac_user" ("id", "tenant_id", "nickname")
     VALUES
       ($1, 'tenant-a', '星河'),
       ($2, 'tenant-a', ''),
       ($3, 'tenant-b', '其他租户昵称'),
       ($4, 'tenant-a', 'sms_18500000942')`,
    [namedUserId, unnamedUserId, crossTenantUserId, sensitiveNameUserId],
  );
  const snapshots = [
    {
      messageId: namedMessageId,
      senderId: namedUserId,
      senderName: 'sms_18800000945',
    },
    {
      messageId: unnamedMessageId,
      senderId: unnamedUserId,
      senderName: 'sms_18900000946_a1b2',
    },
    {
      messageId: crossTenantMessageId,
      senderId: crossTenantUserId,
      senderName: 'sms_18100000947',
    },
    {
      messageId: sensitiveNameMessageId,
      senderId: sensitiveNameUserId,
      senderName: 'sms_18400000951',
    },
    {
      messageId: missingUserMessageId,
      senderId: '00000000-0000-4000-8000-000000000999',
      senderName: 'sms_18200000948',
    },
    {
      messageId: ordinaryMessageId,
      senderId: namedUserId,
      senderName: 'sms_12800000949',
    },
  ];
  for (const snapshot of snapshots) {
    await runner.query(
      `INSERT INTO "sys_chat_message" (
         "id", "tenant_id", "conversationId", "senderId", "type", "content", "reply_to"
       ) VALUES ($1, 'tenant-a', 'conversation-reply', 'user-a', 'text', '引用消息', $2::jsonb)`,
      [
        snapshot.messageId,
        JSON.stringify({
          id: `reply-${snapshot.messageId}`,
          senderId: snapshot.senderId,
          senderName: snapshot.senderName,
          type: 'text',
          content: '原消息内容',
        }),
      ],
    );
  }

  await migration.up(runner);

  const rows = (await runner.query(
    `SELECT "id", "reply_to" FROM "sys_chat_message" WHERE "id" = ANY($1::uuid[])`,
    [snapshots.map((snapshot) => snapshot.messageId)],
  )) as Array<{
    id: string;
    reply_to: { senderId: string; senderName: string; content: string };
  }>;
  const replies = new Map(rows.map((row) => [row.id, row.reply_to]));
  assert.equal(replies.get(namedMessageId)?.senderName, '星河');
  assert.equal(replies.get(unnamedMessageId)?.senderName, '用户00C3D4');
  assert.equal(replies.get(crossTenantMessageId)?.senderName, '成员');
  assert.equal(replies.get(sensitiveNameMessageId)?.senderName, '用户00F7A8');
  assert.equal(replies.get(missingUserMessageId)?.senderName, '成员');
  assert.equal(replies.get(ordinaryMessageId)?.senderName, 'sms_12800000949');
  for (const snapshot of snapshots) {
    assert.equal(replies.get(snapshot.messageId)?.senderId, snapshot.senderId);
    assert.equal(replies.get(snapshot.messageId)?.content, '原消息内容');
  }
});

test('down 保持隐私脱敏结果且不恢复手机号用户名', async () => {
  const migration = new RedactImPhoneSystemMessages1784736300000();
  const messageId = randomUUID();
  await runner.query(
    `INSERT INTO "sys_chat_message" (
       "id", "tenant_id", "conversationId", "senderId", "type", "content"
     ) VALUES ($1, 'tenant-a', 'conversation-down', 'system', 'system', $2)`,
    [messageId, 'sms_18300000950 退出了群聊'],
  );
  await migration.up(runner);
  await migration.down(runner);

  const [message] = (await runner.query(
    `SELECT "content" FROM "sys_chat_message" WHERE "id" = $1`,
    [messageId],
  )) as Array<{ content: string }>;
  assert.equal(message?.content, '成员 退出了群聊');
});
