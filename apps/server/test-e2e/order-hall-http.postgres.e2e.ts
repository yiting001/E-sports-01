import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Module,
  UnauthorizedException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import {
  BOOSTER_ROLE_CODE,
  BOOSTER_SERVICE_REGION,
  BoosterStatus,
  OrderPaymentMethod,
  OrderStatus,
  type BoosterServiceRegion,
} from '@app/contracts';
import type { NextFunction, Request, Response as ExpressResponse } from 'express';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { BoosterApplicationEntity } from '../src/modules/booster/domain/booster-application.entity';
import { ListHallOrdersUseCase } from '../src/modules/order/application/use-cases/list-hall-orders.usecase';
import { BoosterAccess } from '../src/modules/order/application/booster-access.service';
import { ORDER_REPOSITORY } from '../src/modules/order/domain/order-repository.interface';
import { OrderEntity } from '../src/modules/order/domain/order.entity';
import { OrderRefundEntity } from '../src/modules/order/domain/order-refund.entity';
import { TypeormOrderRepository } from '../src/modules/order/infrastructure/order.repository';
import { OrderHallListController } from '../src/modules/order/interfaces/controllers/order.hall.list.controller';
import { PermissionResolver } from '../src/modules/rbac/application/permission-resolver.service';
import { RoleGranter } from '../src/modules/rbac/application/role-granter.service';
import { Permission } from '../src/modules/rbac/domain/permission.entity';
import { ROLE_REPOSITORY } from '../src/modules/rbac/domain/role-repository.interface';
import { Role } from '../src/modules/rbac/domain/role.entity';
import { USER_REPOSITORY } from '../src/modules/rbac/domain/user-repository.interface';
import { User, UserStatus } from '../src/modules/rbac/domain/user.entity';
import { TypeormRoleRepository } from '../src/modules/rbac/infrastructure/role.repository';
import { TypeormUserRepository } from '../src/modules/rbac/infrastructure/user.repository';
import type { AuthUser } from '../src/modules/rbac/interfaces/auth/metadata';
import { TenantContextService } from '../src/shared/tenant/tenant-context.service';

const TENANT_A = 'tenant-hall-http-a';
const TENANT_B = 'tenant-hall-http-b';
const BOOSTER_A = '10000000-0000-4000-8000-000000000001';
const MEMBER_A = '10000000-0000-4000-8000-000000000002';
const PENDING_A = '10000000-0000-4000-8000-000000000003';
const BOOSTER_B = '10000000-0000-4000-8000-000000000004';
const ORDER_IDS = {
  percent: '20000000-0000-4000-8000-000000000001',
  pcNewest: '20000000-0000-4000-8000-000000000002',
  underscore: '20000000-0000-4000-8000-000000000003',
  backslash: '20000000-0000-4000-8000-000000000004',
  orderKeyword: '20000000-0000-4000-8000-000000000005',
  titleKeyword: '20000000-0000-4000-8000-000000000006',
  mobileOldest: '20000000-0000-4000-8000-000000000007',
  pending: '20000000-0000-4000-8000-000000000008',
  tenantB: '20000000-0000-4000-8000-000000000009',
} as const;
const schema = `order_hall_http_e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
const identities = new Map<string, { tenantId: string; username: string }>([
  [BOOSTER_A, { tenantId: TENANT_A, username: 'booster-a' }],
  [MEMBER_A, { tenantId: TENANT_A, username: 'member-a' }],
  [PENDING_A, { tenantId: TENANT_A, username: 'pending-a' }],
  [BOOSTER_B, { tenantId: TENANT_B, username: 'booster-b' }],
]);

let adminDataSource: DataSource;
let dataSource: DataSource;
let app: INestApplication;
let baseUrl = '';

@Injectable()
class TestIdentityGuard implements CanActivate {
  constructor(private readonly tenant: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const userId = request.header('x-test-user')?.trim();
    const identity = userId ? identities.get(userId) : undefined;
    if (!userId || !identity) {
      throw new UnauthorizedException('未认证');
    }
    request.user = { id: userId, username: identity.username };
    this.tenant.set(identity.tenantId, false);
    return true;
  }
}

@Module({
  controllers: [OrderHallListController],
  providers: [
    TenantContextService,
    {
      provide: ORDER_REPOSITORY,
      inject: [TenantContextService],
      useFactory: (tenant: TenantContextService) =>
        new TypeormOrderRepository(dataSource.getRepository(OrderEntity), tenant),
    },
    {
      provide: USER_REPOSITORY,
      inject: [TenantContextService],
      useFactory: (tenant: TenantContextService) =>
        new TypeormUserRepository(dataSource.getRepository(User), tenant),
    },
    {
      provide: ROLE_REPOSITORY,
      inject: [TenantContextService],
      useFactory: (tenant: TenantContextService) =>
        new TypeormRoleRepository(dataSource.getRepository(Role), tenant),
    },
    {
      provide: PermissionResolver,
      useValue: { invalidate: async () => undefined },
    },
    RoleGranter,
    BoosterAccess,
    ListHallOrdersUseCase,
    { provide: APP_GUARD, useClass: TestIdentityGuard },
  ],
})
class OrderHallHttpTestModule {}

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
    entities: [BoosterApplicationEntity, OrderEntity, OrderRefundEntity, Permission, Role, User],
    synchronize: true,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  }).initialize();
  await seedRbacAndBoosterData();
  await seedOrders();

  app = await NestFactory.create(OrderHallHttpTestModule, { logger: false });
  const tenant = app.get(TenantContextService);
  app.use((_request: Request, _response: ExpressResponse, next: NextFunction) => {
    tenant.run({ tenantId: null, isSuper: false }, () => next());
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  await app?.close();
  await dataSource?.destroy();
  if (adminDataSource?.isInitialized) {
    await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminDataSource.destroy();
  }
});

test('已审核且上线打手可访问，并严格隔离两个租户的大厅数据', async () => {
  const application = await dataSource
    .getRepository(BoosterApplicationEntity)
    .findOneByOrFail({ tenantId: TENANT_A, userId: BOOSTER_A });
  assert.equal(application.status, BoosterStatus.Approved);
  assert.equal(application.acceptingOrders, true);

  const tenantA = await readHallPage(await getHall(BOOSTER_A));
  assert.equal(tenantA.total, 7);
  assert.ok(!tenantA.ids.includes(ORDER_IDS.tenantB));
  assert.ok(!tenantA.ids.includes(ORDER_IDS.pending));

  const tenantB = await readHallPage(await getHall(BOOSTER_B));
  assert.equal(tenantB.total, 1);
  assert.deepEqual(tenantB.ids, [ORDER_IDS.tenantB]);
});

test('关键字匹配订单号和商品名，并把百分号、下划线与反斜杠按字面量处理', async () => {
  const orderNumber = await readHallPage(await getHall(BOOSTER_A, { keyword: 'ORDER-SEARCH-900' }));
  assert.deepEqual(orderNumber.ids, [ORDER_IDS.orderKeyword]);

  const productTitle = await readHallPage(await getHall(BOOSTER_A, { keyword: '商品搜索唯一词' }));
  assert.deepEqual(productTitle.ids, [ORDER_IDS.titleKeyword]);

  const percent = await readHallPage(await getHall(BOOSTER_A, { keyword: '%' }));
  assert.deepEqual(percent.ids, [ORDER_IDS.percent]);

  const underscore = await readHallPage(await getHall(BOOSTER_A, { keyword: '_' }));
  assert.deepEqual(underscore.ids, [ORDER_IDS.underscore]);

  const backslash = await readHallPage(await getHall(BOOSTER_A, { keyword: '\\' }));
  assert.deepEqual(backslash.ids, [ORDER_IDS.backslash]);
});

test('区服筛选与分页在同一次真实数据库查询中生效', async () => {
  const mobilePageTwo = await readHallPage(
    await getHall(BOOSTER_A, {
      serviceRegion: BOOSTER_SERVICE_REGION.Mobile,
      page: 2,
      pageSize: 2,
    }),
  );
  assert.equal(mobilePageTwo.total, 5);
  assert.equal(mobilePageTwo.page, 2);
  assert.equal(mobilePageTwo.pageSize, 2);
  assert.deepEqual(mobilePageTwo.ids, [ORDER_IDS.backslash, ORDER_IDS.titleKeyword]);

  const pc = await readHallPage(
    await getHall(BOOSTER_A, { serviceRegion: BOOSTER_SERVICE_REGION.Pc }),
  );
  assert.equal(pc.total, 2);
  assert.deepEqual(pc.ids, [ORDER_IDS.pcNewest, ORDER_IDS.orderKeyword]);
});

test('普通用户、待审核申请人和未认证请求均不能访问大厅', async () => {
  const pendingApplication = await dataSource
    .getRepository(BoosterApplicationEntity)
    .findOneByOrFail({ tenantId: TENANT_A, userId: PENDING_A });
  assert.equal(pendingApplication.status, BoosterStatus.Pending);
  assert.equal(pendingApplication.acceptingOrders, false);

  assert.equal((await getHall(MEMBER_A)).status, 403);
  assert.equal((await getHall(PENDING_A)).status, 403);
  assert.equal((await getHall()).status, 401);
});

async function seedRbacAndBoosterData(): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const userRepository = dataSource.getRepository(User);
  const boosterRepository = dataSource.getRepository(BoosterApplicationEntity);
  const roleA = await roleRepository.save(
    roleRepository.create({ tenantId: TENANT_A, code: BOOSTER_ROLE_CODE, name: '打手' }),
  );
  const roleB = await roleRepository.save(
    roleRepository.create({ tenantId: TENANT_B, code: BOOSTER_ROLE_CODE, name: '打手' }),
  );

  await userRepository.save([
    makeUser(BOOSTER_A, TENANT_A, 'booster-a', [roleA]),
    makeUser(MEMBER_A, TENANT_A, 'member-a', []),
    makeUser(PENDING_A, TENANT_A, 'pending-a', []),
    makeUser(BOOSTER_B, TENANT_B, 'booster-b', [roleB]),
  ]);
  await boosterRepository.save([
    boosterRepository.create({
      tenantId: TENANT_A,
      userId: BOOSTER_A,
      applicantName: '甲租户已上线打手',
      serviceRegions: [BOOSTER_SERVICE_REGION.Mobile, BOOSTER_SERVICE_REGION.Pc],
      intro: 'HTTP E2E approved booster',
      status: BoosterStatus.Approved,
      acceptingOrders: true,
    }),
    boosterRepository.create({
      tenantId: TENANT_A,
      userId: PENDING_A,
      applicantName: '甲租户待审核申请人',
      serviceRegions: [BOOSTER_SERVICE_REGION.Mobile],
      intro: 'HTTP E2E pending applicant',
      status: BoosterStatus.Pending,
      acceptingOrders: false,
    }),
    boosterRepository.create({
      tenantId: TENANT_B,
      userId: BOOSTER_B,
      applicantName: '乙租户已上线打手',
      serviceRegions: [BOOSTER_SERVICE_REGION.Mobile],
      intro: 'HTTP E2E tenant B booster',
      status: BoosterStatus.Approved,
      acceptingOrders: true,
    }),
  ]);
}

function makeUser(id: string, tenantId: string, username: string, roles: Role[]): User {
  return dataSource.getRepository(User).create({
    id,
    tenantId,
    username,
    passwordHash: 'not-used-in-http-e2e',
    nickname: username,
    phone: '',
    status: UserStatus.Enabled,
    roles,
  });
}

async function seedOrders(): Promise<void> {
  const orders: Array<{
    id: string;
    tenantId: string;
    orderNo: string;
    productTitle: string;
    serviceRegion: BoosterServiceRegion;
    dispatchedAt: string;
    status?: OrderStatus;
  }> = [
    {
      id: ORDER_IDS.pending,
      tenantId: TENANT_A,
      orderNo: 'HALL-PENDING-HIDDEN',
      productTitle: '不应进入大厅的待客服订单',
      serviceRegion: BOOSTER_SERVICE_REGION.Mobile,
      dispatchedAt: '2026-07-26T11:00:00.000Z',
      status: OrderStatus.PendingService,
    },
    {
      id: ORDER_IDS.percent,
      tenantId: TENANT_A,
      orderNo: 'HALL-50%-MATCH',
      productTitle: '百分号专单',
      serviceRegion: BOOSTER_SERVICE_REGION.Mobile,
      dispatchedAt: '2026-07-26T10:00:00.000Z',
    },
    {
      id: ORDER_IDS.pcNewest,
      tenantId: TENANT_A,
      orderNo: 'HALL-PC-NEW',
      productTitle: '电脑端新单',
      serviceRegion: BOOSTER_SERVICE_REGION.Pc,
      dispatchedAt: '2026-07-26T09:00:00.000Z',
    },
    {
      id: ORDER_IDS.underscore,
      tenantId: TENANT_A,
      orderNo: 'HALL-UNDER',
      productTitle: '护航_限定',
      serviceRegion: BOOSTER_SERVICE_REGION.Mobile,
      dispatchedAt: '2026-07-26T08:00:00.000Z',
    },
    {
      id: ORDER_IDS.backslash,
      tenantId: TENANT_A,
      orderNo: 'HALL-SLASH',
      productTitle: '路径\\专属',
      serviceRegion: BOOSTER_SERVICE_REGION.Mobile,
      dispatchedAt: '2026-07-26T07:00:00.000Z',
    },
    {
      id: ORDER_IDS.orderKeyword,
      tenantId: TENANT_A,
      orderNo: 'ORDER-SEARCH-900',
      productTitle: '普通电脑端订单',
      serviceRegion: BOOSTER_SERVICE_REGION.Pc,
      dispatchedAt: '2026-07-26T06:00:00.000Z',
    },
    {
      id: ORDER_IDS.titleKeyword,
      tenantId: TENANT_A,
      orderNo: 'HALL-TITLE-SEARCH',
      productTitle: '商品搜索唯一词',
      serviceRegion: BOOSTER_SERVICE_REGION.Mobile,
      dispatchedAt: '2026-07-26T05:00:00.000Z',
    },
    {
      id: ORDER_IDS.mobileOldest,
      tenantId: TENANT_A,
      orderNo: 'HALL-MOBILE-OLD',
      productTitle: '普通手机端订单',
      serviceRegion: BOOSTER_SERVICE_REGION.Mobile,
      dispatchedAt: '2026-07-26T04:00:00.000Z',
    },
    {
      id: ORDER_IDS.tenantB,
      tenantId: TENANT_B,
      orderNo: 'HALL-TENANT-B',
      productTitle: '商品搜索唯一词',
      serviceRegion: BOOSTER_SERVICE_REGION.Mobile,
      dispatchedAt: '2026-07-26T12:00:00.000Z',
    },
  ];
  const repository = dataSource.getRepository(OrderEntity);
  await repository.save(
    orders.map((order) =>
      repository.create({
        id: order.id,
        tenantId: order.tenantId,
        userId: `owner-${order.id.slice(-6)}`,
        orderNo: order.orderNo,
        productId: `product-${order.id.slice(-6)}`,
        productTitle: order.productTitle,
        quantity: 1,
        amountFen: 1_000,
        originalAmountFen: 1_000,
        provider: OrderPaymentMethod.Balance,
        status: order.status ?? OrderStatus.Dispatching,
        serviceRegion: order.serviceRegion,
        dispatchedAt: new Date(order.dispatchedAt),
        paidAt: new Date('2026-07-26T00:00:00.000Z'),
      }),
    ),
  );
}

function getHall(userId?: string, query: Record<string, string | number> = {}): Promise<Response> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    search.set(key, String(value));
  }
  const suffix = search.size > 0 ? `?${search.toString()}` : '';
  return fetch(`${baseUrl}/order/hall${suffix}`, {
    headers: userId ? { 'x-test-user': userId } : {},
  });
}

interface HallPage {
  ids: string[];
  total: number;
  page: number;
  pageSize: number;
}

async function readHallPage(response: Response): Promise<HallPage> {
  assert.equal(response.status, 200);
  const body: unknown = await response.json();
  assert.ok(isRecord(body));
  assert.ok(Array.isArray(body.list));
  const { total, page, pageSize } = body;
  assert.ok(typeof total === 'number');
  assert.ok(typeof page === 'number');
  assert.ok(typeof pageSize === 'number');
  const ids = body.list.map((item: unknown) => {
    assert.ok(isRecord(item));
    const { id } = item;
    assert.ok(typeof id === 'string');
    return id;
  });
  return { ids, total, page, pageSize };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
