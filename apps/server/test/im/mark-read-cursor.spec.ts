import assert from 'node:assert/strict';
import test from 'node:test';
import type { Repository, UpdateResult } from 'typeorm';
import { MarkReadUseCase } from '../../src/modules/im/application/use-cases/mark-read.usecase';
import { ConversationMemberEntity } from '../../src/modules/im/domain/conversation-member.entity';
import type { ConversationMemberRepository } from '../../src/modules/im/domain/conversation-member-repository.interface';
import { ChatMessageEntity } from '../../src/modules/im/domain/message.entity';
import type { MessageRepository } from '../../src/modules/im/domain/message-repository.interface';
import { TypeormConversationMemberRepository } from '../../src/modules/im/infrastructure/conversation-member.repository';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

interface FakeUpdateBuilder {
  update(): FakeUpdateBuilder;
  set(values: { lastReadAt: () => string }): FakeUpdateBuilder;
  where(scope: Record<string, string>): FakeUpdateBuilder;
  andWhere(condition: string): FakeUpdateBuilder;
  setParameters(params: Record<string, string>): FakeUpdateBuilder;
  execute(): Promise<UpdateResult>;
}

interface FakeCursorBuilder {
  getParameters(): Record<string, string>;
  getQuery(): string;
  select(selection: string): FakeCursorBuilder;
  where(condition: string, params: Record<string, string>): FakeCursorBuilder;
}

test('已读用例只使用已确认消息时间并拒绝跨会话消息游标', async () => {
  const member = new ConversationMemberEntity();
  member.conversationId = 'conversation-1';
  member.userId = 'user-1';

  const message = new ChatMessageEntity();
  message.id = 'message-1';
  message.conversationId = 'conversation-1';
  message.createdAt = new Date('2026-07-22T01:02:03.000Z');

  const updates: Array<{ conversationId: string; messageId: string; userId: string }> = [];
  const members: Pick<
    ConversationMemberRepository,
    'findOne' | 'updateLastReadToMessage'
  > = {
    async findOne() {
      return member;
    },
    async updateLastReadToMessage(conversationId, userId, messageId) {
      updates.push({ conversationId, messageId, userId });
    },
  };
  const messages: Pick<MessageRepository, 'findById'> = {
    async findById() {
      return message;
    },
  };
  const useCase = new MarkReadUseCase(
    members as ConversationMemberRepository,
    messages as MessageRepository,
  );

  await useCase.execute('conversation-1', 'user-1', 'message-1');

  assert.deepEqual(updates, [
    {
      conversationId: 'conversation-1',
      messageId: 'message-1',
      userId: 'user-1',
    },
  ]);

  message.conversationId = 'conversation-2';
  await assert.rejects(
    useCase.execute('conversation-1', 'user-1', 'message-1'),
    /已读消息不属于当前会话/,
  );
  assert.equal(updates.length, 1);
});

test('TypeORM 已读更新带租户条件且只允许 lastReadAt 单调前进', async () => {
  const calls: {
    conditions: string[];
    cursorCondition?: string;
    cursorParams?: Record<string, string>;
    cursorSelection?: string;
    parameters?: Record<string, string>;
    scope?: Record<string, string>;
    values?: { lastReadAt: () => string };
  } = { conditions: [] };
  const cursorBuilder: FakeCursorBuilder = {
    getParameters() {
      return calls.cursorParams ?? {};
    },
    getQuery() {
      return 'SELECT message.created_at FROM sys_chat_message message';
    },
    select(selection) {
      calls.cursorSelection = selection;
      return cursorBuilder;
    },
    where(condition, params) {
      calls.cursorCondition = condition;
      calls.cursorParams = params;
      return cursorBuilder;
    },
  };
  const builder: FakeUpdateBuilder = {
    update() {
      return builder;
    },
    set(values) {
      calls.values = values;
      return builder;
    },
    where(scope) {
      calls.scope = scope;
      return builder;
    },
    andWhere(condition) {
      calls.conditions.push(condition);
      return builder;
    },
    setParameters(params) {
      calls.parameters = params;
      return builder;
    },
    async execute(): Promise<UpdateResult> {
      return { affected: 1, generatedMaps: [], raw: [] };
    },
  };
  const ormRepository = {
    manager: {
      createQueryBuilder() {
        return cursorBuilder;
      },
    },
    createQueryBuilder() {
      return builder;
    },
  };
  const tenant = new TenantContextService();
  const repository = new TypeormConversationMemberRepository(
    ormRepository as unknown as Repository<ConversationMemberEntity>,
    tenant,
  );
  await tenant.run({ isSuper: false, tenantId: 'tenant-1' }, () =>
    repository.updateLastReadToMessage('conversation-1', 'user-1', 'message-1'),
  );

  assert.deepEqual(calls.scope, {
    conversationId: 'conversation-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
  });
  assert.equal(calls.cursorSelection, 'message.createdAt');
  assert.match(calls.cursorCondition ?? '', /message.tenantId = :cursorTenantId/);
  assert.deepEqual(calls.cursorParams, {
    cursorConversationId: 'conversation-1',
    cursorMessageId: 'message-1',
    cursorTenantId: 'tenant-1',
  });
  assert.equal(
    calls.values?.lastReadAt(),
    '(SELECT message.created_at FROM sys_chat_message message)',
  );
  assert.equal(calls.conditions.length, 2);
  assert.match(calls.conditions[0] ?? '', /IS NOT NULL/);
  assert.match(calls.conditions[1] ?? '', /last_read_at < \(SELECT/);
  assert.deepEqual(calls.parameters, calls.cursorParams);
});
