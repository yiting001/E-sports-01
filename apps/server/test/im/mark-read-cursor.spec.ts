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
  set(values: { lastReadAt: Date }): FakeUpdateBuilder;
  where(scope: Record<string, string>): FakeUpdateBuilder;
  andWhere(condition: string, params: { at: Date }): FakeUpdateBuilder;
  execute(): Promise<UpdateResult>;
}

test('已读用例只使用已确认消息时间并拒绝跨会话消息游标', async () => {
  const member = new ConversationMemberEntity();
  member.conversationId = 'conversation-1';
  member.userId = 'user-1';

  const message = new ChatMessageEntity();
  message.id = 'message-1';
  message.conversationId = 'conversation-1';
  message.createdAt = new Date('2026-07-22T01:02:03.000Z');

  const updates: Array<{ at: Date; conversationId: string; userId: string }> = [];
  const members: Pick<ConversationMemberRepository, 'findOne' | 'updateLastRead'> = {
    async findOne() {
      return member;
    },
    async updateLastRead(conversationId, userId, at) {
      updates.push({ at, conversationId, userId });
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
      at: message.createdAt,
      conversationId: 'conversation-1',
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
    condition?: string;
    conditionParams?: { at: Date };
    scope?: Record<string, string>;
    values?: { lastReadAt: Date };
  } = {};
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
    andWhere(condition, params) {
      calls.condition = condition;
      calls.conditionParams = params;
      return builder;
    },
    async execute(): Promise<UpdateResult> {
      return { affected: 1, generatedMaps: [], raw: [] };
    },
  };
  const ormRepository = {
    createQueryBuilder() {
      return builder;
    },
  };
  const tenant = new TenantContextService();
  const repository = new TypeormConversationMemberRepository(
    ormRepository as unknown as Repository<ConversationMemberEntity>,
    tenant,
  );
  const at = new Date('2026-07-22T02:03:04.000Z');

  await tenant.run({ isSuper: false, tenantId: 'tenant-1' }, () =>
    repository.updateLastRead('conversation-1', 'user-1', at),
  );

  assert.deepEqual(calls.scope, {
    conversationId: 'conversation-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
  });
  assert.deepEqual(calls.values, { lastReadAt: at });
  assert.equal(calls.condition, '(last_read_at IS NULL OR last_read_at < :at)');
  assert.deepEqual(calls.conditionParams, { at });
});
