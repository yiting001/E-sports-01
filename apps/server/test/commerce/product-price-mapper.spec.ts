import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductStatus } from '@app/contracts';
import {
  toProductPublicView,
  toProductView,
} from '../../src/modules/commerce/application/product.mapper';
import { ProductEntity } from '../../src/modules/commerce/domain/product.entity';

function createProduct(): ProductEntity {
  return Object.assign(new ProductEntity(), {
    id: 'product-1',
    categoryId: 'category-1',
    title: '三角洲陪玩',
    cover: '',
    coverTitle: '极速接单',
    coverSub: '',
    description: '',
    priceFen: 1_000,
    originPriceFen: 1_200,
    pcPriceFen: 1_500,
    pcOriginPriceFen: 1_800,
    sold: 0,
    serviceAgentId: '',
    status: ProductStatus.OffShelf,
    sort: 0,
    createdAt: new Date('2026-07-26T00:00:00.000Z'),
    updatedAt: new Date('2026-07-26T00:00:00.000Z'),
  });
}

test('商品管理与公开视图都返回手机端和电脑端价格', () => {
  const product = createProduct();
  for (const view of [toProductView(product), toProductPublicView(product)]) {
    assert.deepEqual(
      {
        priceFen: view.priceFen,
        originPriceFen: view.originPriceFen,
        pcPriceFen: view.pcPriceFen,
        pcOriginPriceFen: view.pcOriginPriceFen,
      },
      {
        priceFen: 1_000,
        originPriceFen: 1_200,
        pcPriceFen: 1_500,
        pcOriginPriceFen: 1_800,
      },
    );
  }
});
