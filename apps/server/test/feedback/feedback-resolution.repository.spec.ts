import assert from 'node:assert/strict';
import test from 'node:test';
import { FeedbackStatus, FeedbackType } from '@app/contracts';
import type { EntityManager, Repository } from 'typeorm';
import { FeedbackEntity } from '../../src/modules/feedback/domain/feedback.entity';
import { TypeormFeedbackRepository } from '../../src/modules/feedback/infrastructure/feedback.repository';
import { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

interface FindRequest {
  where: Partial<FeedbackEntity>;
  lock?: { mode: string };
}

class FeedbackResolutionHarness {
  readonly repository: Repository<FeedbackEntity>;
  saveCount = 0;
  lockCount = 0;
  private queue: Promise<void> = Promise.resolve();

  constructor(readonly feedback: FeedbackEntity) {
    const manager = {
      getRepository: (target: unknown) => {
        assert.equal(target, FeedbackEntity);
        return {
          findOne: (request: FindRequest) => this.findOne(request),
          save: (entity: FeedbackEntity) => this.save(entity),
        };
      },
    } as unknown as EntityManager;
    this.repository = {
      manager: {
        transaction: <T>(work: (entityManager: EntityManager) => Promise<T>) =>
          this.serialized(() => work(manager)),
      },
    } as unknown as Repository<FeedbackEntity>;
  }

  private async serialized<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release = (): void => undefined;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }

  private findOne(request: FindRequest): FeedbackEntity | null {
    if (request.lock) {
      this.lockCount += 1;
    }
    return Object.entries(request.where).every(
      ([key, value]) => this.feedback[key as keyof FeedbackEntity] === value,
    )
      ? this.feedback
      : null;
  }

  private save(entity: FeedbackEntity): FeedbackEntity {
    this.saveCount += 1;
    return entity;
  }
}

function makeFeedback(): FeedbackEntity {
  return Object.assign(new FeedbackEntity(), {
    id: 'feedback-1',
    tenantId: 'tenant-1',
    userId: 'owner-1',
    type: FeedbackType.Other,
    status: FeedbackStatus.Pending,
    replyContent: '',
    handledBy: '',
    handledAt: null,
  });
}

test('同一待处理反馈并发回复只有一个处理者完成状态迁移', async () => {
  const harness = new FeedbackResolutionHarness(makeFeedback());
  const tenant = new TenantContextService();
  const repository = new TypeormFeedbackRepository(harness.repository, tenant);

  const results = await tenant.run({ tenantId: 'tenant-1', isSuper: false }, () =>
    Promise.all([
      repository.resolvePending('feedback-1', 'handler-1', '回复一'),
      repository.resolvePending('feedback-1', 'handler-2', '回复二'),
    ]),
  );

  assert.equal(results.filter((result) => result.outcome === 'resolved').length, 1);
  assert.equal(results.filter((result) => result.outcome === 'already_resolved').length, 1);
  assert.equal(harness.saveCount, 1);
  assert.equal(harness.lockCount, 2);
});

test('普通反馈处理按当前租户隔离', async () => {
  const harness = new FeedbackResolutionHarness(makeFeedback());
  const tenant = new TenantContextService();
  const repository = new TypeormFeedbackRepository(harness.repository, tenant);

  const result = await tenant.run({ tenantId: 'tenant-2', isSuper: false }, () =>
    repository.resolvePending('feedback-1', 'handler-2', '越权回复'),
  );

  assert.deepEqual(result, { outcome: 'not_found' });
  assert.equal(harness.saveCount, 0);
});
