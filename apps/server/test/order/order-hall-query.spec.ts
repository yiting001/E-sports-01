import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOSTER_LEVEL_DEFAULTS, type BoosterServiceRegion } from '@app/contracts';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import type { BoosterProgressService } from '../../src/modules/booster/application/booster-progress.service';
import type { BoosterAccess } from '../../src/modules/order/application/booster-access.service';
import type { ProductRepository } from '../../src/modules/commerce/domain/product-repository.interface';
import { ListHallOrdersUseCase } from '../../src/modules/order/application/use-cases/list-hall-orders.usecase';
import { OrderEntity } from '../../src/modules/order/domain/order.entity';
import type {
  HallOrderFilter,
  OrderRepository,
} from '../../src/modules/order/domain/order-repository.interface';
import { TypeormOrderRepository } from '../../src/modules/order/infrastructure/order.repository';
import { OrderHallListQueryDto } from '../../src/modules/order/interfaces/dto/order-hall-list-query.dto';
import type { TenantContextService } from '../../src/shared/tenant/tenant-context.service';

test('大厅查询 DTO 修剪关键字并校验区服与长度', async () => {
  const valid = plainToInstance(OrderHallListQueryDto, {
    page: '2',
    pageSize: '20',
    keyword: '  陪玩服务  ',
    serviceRegion: 'delta-mobile',
  });
  assert.equal((await validate(valid)).length, 0);
  assert.equal(valid.keyword, '陪玩服务');
  assert.equal(valid.serviceRegion, 'delta-mobile');

  const invalid = plainToInstance(OrderHallListQueryDto, {
    keyword: 'x'.repeat(65),
    serviceRegion: 'unknown-region',
  });
  const invalidProperties = new Set((await validate(invalid)).map((error) => error.property));
  assert.ok(invalidProperties.has('keyword'));
  assert.ok(invalidProperties.has('serviceRegion'));
});

test('大厅用例在打手门禁后把筛选条件透传给仓储', async () => {
  let assertedUserId = '';
  let capturedFilter: HallOrderFilter | undefined;
  const orders = {
    paginateDispatching: async (_skip: number, _take: number, filter: HallOrderFilter) => {
      capturedFilter = filter;
      return [[], 0] as [OrderEntity[], number];
    },
  } as unknown as OrderRepository;
  const access = {
    assert: async (userId: string) => {
      assertedUserId = userId;
    },
  } as unknown as BoosterAccess;
  const progress = {
    currentTier: async () => BOOSTER_LEVEL_DEFAULTS[0],
  } as unknown as BoosterProgressService;
  const products = {
    findById: async () => null,
  } as unknown as ProductRepository;
  const useCase = new ListHallOrdersUseCase(orders, products, access, progress);
  const filter: HallOrderFilter = {
    keyword: 'ORDER-2026',
    serviceRegion: 'delta-pc',
  };

  const result = await useCase.execute('booster-1', 2, 20, 20, filter);

  assert.equal(assertedUserId, 'booster-1');
  assert.deepEqual(capturedFilter, filter);
  assert.deepEqual(result, { list: [], total: 0, page: 2, pageSize: 20 });
});

test('大厅仓储把租户、待接单状态、区服和转义关键字放进同一个查询', async () => {
  const clauses: Array<{ condition: string; parameters?: Record<string, unknown> }> = [];
  const queryBuilder = {
    leftJoinAndSelect: () => queryBuilder,
    where: (condition: string, parameters?: Record<string, unknown>) => {
      clauses.push({ condition, parameters });
      return queryBuilder;
    },
    andWhere: (condition: string, parameters?: Record<string, unknown>) => {
      clauses.push({ condition, parameters });
      return queryBuilder;
    },
    orderBy: () => queryBuilder,
    addOrderBy: () => queryBuilder,
    skip: () => queryBuilder,
    take: () => queryBuilder,
    getManyAndCount: async () => [[], 0] as [OrderEntity[], number],
  } as unknown as SelectQueryBuilder<OrderEntity>;
  const typeormRepository = {
    createQueryBuilder: (alias: string) => {
      assert.equal(alias, 'serviceOrder');
      return queryBuilder;
    },
  } as unknown as Repository<OrderEntity>;
  const tenant = {
    scopeId: () => 'tenant-1',
  } as unknown as TenantContextService;
  const repository = new TypeormOrderRepository(typeormRepository, tenant);
  const serviceRegion: BoosterServiceRegion = 'delta-mobile';

  await repository.paginateDispatching(0, 10, {
    keyword: '50%_陪玩',
    serviceRegion,
  });

  assert.ok(
    clauses.some(
      ({ condition, parameters }) =>
        condition.includes('serviceOrder.tenantId') && parameters?.__tenantId === 'tenant-1',
    ),
  );
  assert.ok(
    clauses.some(
      ({ condition, parameters }) =>
        condition.includes('serviceOrder.status') && parameters?.status === 'dispatching',
    ),
  );
  assert.ok(
    clauses.some(
      ({ condition, parameters }) =>
        condition.includes('serviceOrder.serviceRegion') &&
        parameters?.serviceRegion === serviceRegion,
    ),
  );
  assert.ok(
    clauses.some(
      ({ condition, parameters }) =>
        condition.includes('serviceOrder.orderNo') &&
        condition.includes('serviceOrder.productTitle') &&
        parameters?.keyword === '%50\\%\\_陪玩%',
    ),
  );
});
