import assert from 'node:assert/strict';
import test from 'node:test';
import type { Repository } from 'typeorm';
import type { BoosterCandidateService } from '../../src/modules/booster/application/booster-candidate.service';
import { BoosterApplicationEntity } from '../../src/modules/booster/domain/booster-application.entity';
import { TypeormBoosterDirectoryQuery } from '../../src/modules/booster/infrastructure/booster-directory.query';
import { ListBoosterCandidatesUseCase } from '../../src/modules/order/application/use-cases/list-booster-candidates.usecase';
import type { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

class CandidateQueryBuilderStub {
  readonly conditions: string[] = [];
  readonly parameters: Array<Record<string, unknown> | undefined> = [];

  innerJoin(): this {
    return this;
  }

  where(condition: string, parameters?: Record<string, unknown>): this {
    this.conditions.push(condition);
    this.parameters.push(parameters);
    return this;
  }

  andWhere(condition: string, parameters?: Record<string, unknown>): this {
    this.conditions.push(condition);
    this.parameters.push(parameters);
    return this;
  }

  clone(): this {
    return this;
  }

  async getCount(): Promise<number> {
    return 1;
  }

  select(): this {
    return this;
  }

  orderBy(): this {
    return this;
  }

  skip(): this {
    return this;
  }

  take(): this {
    return this;
  }

  async getRawMany(): Promise<Array<{ id: string; username: string; nickname: string }>> {
    return [{ id: 'booster-id', username: 'booster', nickname: '小安' }];
  }
}

test('管理端候选查询只检索同租户审核有效且已上线的打手', async () => {
  const builder = new CandidateQueryBuilderStub();
  const repository = {
    createQueryBuilder: () => builder,
  } as unknown as Repository<BoosterApplicationEntity>;
  const tenant = { tenantId: 'tenant-1' } as unknown as TenantContextService;
  const query = new TypeormBoosterDirectoryQuery(repository, tenant);

  const [rows, total] = await query.paginateAvailableCandidates(0, 20, ' 小安 ');

  assert.equal(total, 1);
  assert.deepEqual(rows, [{ id: 'booster-id', username: 'booster', nickname: '小安' }]);
  assert.ok(builder.conditions.some((condition) => condition.includes('"tenant_id"')));
  assert.ok(builder.conditions.some((condition) => condition.includes('"status" = :approved')));
  assert.ok(builder.conditions.some((condition) => condition.includes('"directory_user"."status"')));
  assert.ok(builder.conditions.some((condition) => condition.includes('"directory_role"."code"')));
  assert.ok(builder.conditions.some((condition) => condition.includes('"accepting_orders"')));
  assert.ok(
    builder.parameters.some((parameters) => parameters?.candidateKeyword === '%小安%'),
  );
});

test('订单候选用例复用打手模块的可用候选端口并保留分页信息', async () => {
  const candidates = {
    paginate: async () => [
      [{ id: 'booster-id', username: 'booster', nickname: '小安' }],
      1,
    ],
  } as unknown as BoosterCandidateService;
  const useCase = new ListBoosterCandidatesUseCase(candidates);

  const result = await useCase.execute(2, 20, 20, '小安');

  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 20);
  assert.equal(result.total, 1);
  assert.equal(result.list[0]?.id, 'booster-id');
});
