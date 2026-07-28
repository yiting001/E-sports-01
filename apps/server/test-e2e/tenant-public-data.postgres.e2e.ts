import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { Module, ValidationPipe, type INestApplication } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import {
  DEFAULT_TENANT_CODE,
  DEFAULT_TENANT_ID,
  ProductStatus,
  TenantStatus,
} from '@app/contracts';
import type { NextFunction, Request, Response as ExpressResponse } from 'express';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../src/bootstrap/env.config';
import { ListPublicCategoriesUseCase } from '../src/modules/commerce/application/use-cases/list-public-categories.usecase';
import { ListPublicProductsUseCase } from '../src/modules/commerce/application/use-cases/list-public-products.usecase';
import { CATEGORY_REPOSITORY } from '../src/modules/commerce/domain/category-repository.interface';
import { CategoryEntity } from '../src/modules/commerce/domain/category.entity';
import { PRODUCT_REPOSITORY } from '../src/modules/commerce/domain/product-repository.interface';
import { ProductEntity } from '../src/modules/commerce/domain/product.entity';
import { TypeormCategoryRepository } from '../src/modules/commerce/infrastructure/category.repository';
import { TypeormProductRepository } from '../src/modules/commerce/infrastructure/product.repository';
import { CategoryPublicListController } from '../src/modules/commerce/interfaces/controllers/category.public-list.controller';
import { ProductPublicListController } from '../src/modules/commerce/interfaces/controllers/product.public-list.controller';
import { TenantResolver } from '../src/modules/rbac/application/tenant-resolver.service';
import { TENANT_REPOSITORY } from '../src/modules/rbac/domain/tenant-repository.interface';
import { TenantEntity } from '../src/modules/rbac/domain/tenant.entity';
import { TypeormTenantRepository } from '../src/modules/rbac/infrastructure/tenant.repository';
import { TenantAccessGuard } from '../src/modules/rbac/interfaces/auth/tenant-access.guard';
import { TenantContextService } from '../src/shared/tenant/tenant-context.service';

const TENANT_A = {
  id: '10000000-0000-4000-8000-0000000000a1',
  code: 'tenant-e2e-a',
  categoryId: '20000000-0000-4000-8000-0000000000a1',
  categoryName: '租户 A 专属分类',
  productId: '30000000-0000-4000-8000-0000000000a1',
  productTitle: '租户 A 专属商品',
} as const;
const TENANT_B = {
  id: '10000000-0000-4000-8000-0000000000b1',
  code: 'tenant-e2e-b',
  categoryId: '20000000-0000-4000-8000-0000000000b1',
  categoryName: '租户 B 专属分类',
  productId: '30000000-0000-4000-8000-0000000000b1',
  productTitle: '租户 B 专属商品',
} as const;
const DEFAULT_CATALOG = {
  categoryId: '20000000-0000-4000-8000-0000000000d1',
  categoryName: '默认租户专属分类',
  productId: '30000000-0000-4000-8000-0000000000d1',
  productTitle: '默认租户专属商品',
} as const;
const DISABLED_TENANT = {
  id: '10000000-0000-4000-8000-0000000000f1',
  code: 'tenant-e2e-disabled',
} as const;
const schema = `tenant_public_data_${randomUUID().replaceAll('-', '').slice(0, 16)}`;

let adminDataSource: DataSource;
let dataSource: DataSource;
let app: INestApplication;
let baseUrl = '';

@Module({
  controllers: [CategoryPublicListController, ProductPublicListController],
  providers: [
    TenantContextService,
    TenantResolver,
    ListPublicCategoriesUseCase,
    ListPublicProductsUseCase,
    {
      provide: TENANT_REPOSITORY,
      useFactory: () => new TypeormTenantRepository(dataSource.getRepository(TenantEntity)),
    },
    {
      provide: CATEGORY_REPOSITORY,
      inject: [TenantContextService],
      useFactory: (tenant: TenantContextService) =>
        new TypeormCategoryRepository(
          dataSource.getRepository(CategoryEntity),
          dataSource.getRepository(ProductEntity),
          tenant,
        ),
    },
    {
      provide: PRODUCT_REPOSITORY,
      inject: [TenantContextService],
      useFactory: (tenant: TenantContextService) =>
        new TypeormProductRepository(dataSource.getRepository(ProductEntity), tenant),
    },
    { provide: APP_GUARD, useClass: TenantAccessGuard },
  ],
})
class TenantPublicDataTestModule {}

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
    entities: [TenantEntity, CategoryEntity, ProductEntity],
    synchronize: true,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  }).initialize();
  await seedCatalogs();

  app = await NestFactory.create(TenantPublicDataTestModule, { logger: false });
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
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  if (adminDataSource?.isInitialized) {
    await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminDataSource.destroy();
  }
});

test('X-Tenant-Code 在并发公开请求中严格隔离租户 A 与租户 B', async () => {
  const requests = Array.from({ length: 6 }, async (_, index) =>
    readCatalog(index % 2 === 0 ? TENANT_A.code : TENANT_B.code),
  );
  const catalogs = await Promise.all(requests);

  catalogs.forEach((catalog, index) => {
    const expected = index % 2 === 0 ? TENANT_A : TENANT_B;
    assert.deepEqual(catalog.categoryNames, [expected.categoryName]);
    assert.deepEqual(catalog.productTitles, [expected.productTitle]);
    assert.deepEqual(catalog.productCategoryNames, [expected.categoryName]);
    assert.equal(catalog.total, 1);
  });
});

test('缺省租户编码只返回 default 数据，不能退化为全租户查询', async () => {
  const catalog = await readCatalog();

  assert.deepEqual(catalog.categoryNames, [DEFAULT_CATALOG.categoryName]);
  assert.deepEqual(catalog.productTitles, [DEFAULT_CATALOG.productTitle]);
  assert.deepEqual(catalog.productCategoryNames, [DEFAULT_CATALOG.categoryName]);
  assert.equal(catalog.total, 1);
});

test('未知租户与停用租户在读取公开商品或分类前均被拒绝', async () => {
  const responses = await Promise.all([
    getPublicCategories('tenant-e2e-unknown'),
    getPublicProducts('tenant-e2e-unknown'),
    getPublicCategories(DISABLED_TENANT.code),
    getPublicProducts(DISABLED_TENANT.code),
  ]);

  assert.deepEqual(
    responses.map((response) => response.status),
    [401, 401, 401, 401],
  );
});

async function seedCatalogs(): Promise<void> {
  const tenantRepository = dataSource.getRepository(TenantEntity);
  await tenantRepository.save([
    tenantRepository.create({
      id: DEFAULT_TENANT_ID,
      code: DEFAULT_TENANT_CODE,
      name: '默认租户',
      status: TenantStatus.Enabled,
      builtin: true,
    }),
    tenantRepository.create({
      id: TENANT_A.id,
      code: TENANT_A.code,
      name: '租户 A',
      status: TenantStatus.Enabled,
    }),
    tenantRepository.create({
      id: TENANT_B.id,
      code: TENANT_B.code,
      name: '租户 B',
      status: TenantStatus.Enabled,
    }),
    tenantRepository.create({
      id: DISABLED_TENANT.id,
      code: DISABLED_TENANT.code,
      name: '停用租户',
      status: TenantStatus.Disabled,
    }),
  ]);

  const categoryRepository = dataSource.getRepository(CategoryEntity);
  await categoryRepository.save([
    makeCategory(DEFAULT_TENANT_ID, DEFAULT_CATALOG),
    makeCategory(TENANT_A.id, TENANT_A),
    makeCategory(TENANT_B.id, TENANT_B),
    categoryRepository.create({
      tenantId: TENANT_A.id,
      name: '租户 A 停用分类',
      enabled: false,
      sort: 99,
    }),
  ]);

  const productRepository = dataSource.getRepository(ProductEntity);
  await productRepository.save([
    makeProduct(DEFAULT_TENANT_ID, DEFAULT_CATALOG),
    makeProduct(TENANT_A.id, TENANT_A),
    makeProduct(TENANT_B.id, TENANT_B),
    productRepository.create({
      tenantId: TENANT_A.id,
      categoryId: TENANT_A.categoryId,
      title: '租户 A 下架商品',
      status: ProductStatus.OffShelf,
      sort: 99,
    }),
  ]);
}

interface CatalogSeed {
  categoryId: string;
  categoryName: string;
  productId: string;
  productTitle: string;
}

function makeCategory(tenantId: string, seed: CatalogSeed): CategoryEntity {
  return dataSource.getRepository(CategoryEntity).create({
    id: seed.categoryId,
    tenantId,
    name: seed.categoryName,
    enabled: true,
    sort: 1,
  });
}

function makeProduct(tenantId: string, seed: CatalogSeed): ProductEntity {
  return dataSource.getRepository(ProductEntity).create({
    id: seed.productId,
    tenantId,
    categoryId: seed.categoryId,
    title: seed.productTitle,
    priceFen: 1_000,
    originPriceFen: 1_200,
    pcPriceFen: 1_100,
    pcOriginPriceFen: 1_300,
    status: ProductStatus.OnShelf,
    sort: 1,
  });
}

interface CatalogResult {
  categoryNames: string[];
  productTitles: string[];
  productCategoryNames: string[];
  total: number;
}

async function readCatalog(tenantCode?: string): Promise<CatalogResult> {
  const [categoryResponse, productResponse] = await Promise.all([
    getPublicCategories(tenantCode),
    getPublicProducts(tenantCode),
  ]);
  assert.equal(categoryResponse.status, 200);
  assert.equal(productResponse.status, 200);

  const categories: unknown = await categoryResponse.json();
  const products: unknown = await productResponse.json();
  assert.ok(Array.isArray(categories));
  assert.ok(isRecord(products));
  assert.ok(Array.isArray(products.list));
  const total = products.total;
  assert.ok(typeof total === 'number');

  return {
    categoryNames: categories.map((category) => readStringField(category, 'name')),
    productTitles: products.list.map((product) => readStringField(product, 'title')),
    productCategoryNames: products.list.map((product) => readStringField(product, 'categoryName')),
    total,
  };
}

function getPublicCategories(tenantCode?: string): Promise<Response> {
  return fetch(`${baseUrl}/commerce/public/categories`, {
    headers: tenantHeaders(tenantCode),
  });
}

function getPublicProducts(tenantCode?: string): Promise<Response> {
  return fetch(`${baseUrl}/commerce/public/products`, {
    headers: tenantHeaders(tenantCode),
  });
}

function tenantHeaders(tenantCode?: string): Record<string, string> {
  return tenantCode ? { 'X-Tenant-Code': tenantCode } : {};
}

function readStringField(value: unknown, field: string): string {
  assert.ok(isRecord(value));
  const result = value[field];
  assert.ok(typeof result === 'string');
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
