import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductStatus } from '@app/contracts';
import type { ProductViewAssembler } from '../../src/modules/commerce/application/product-view.assembler';
import { PublishProductUseCase } from '../../src/modules/commerce/application/use-cases/publish-product.usecase';
import { UpdateProductUseCase } from '../../src/modules/commerce/application/use-cases/update-product.usecase';
import type { CategoryRepository } from '../../src/modules/commerce/domain/category-repository.interface';
import type { ProductRepository } from '../../src/modules/commerce/domain/product-repository.interface';
import { ProductEntity } from '../../src/modules/commerce/domain/product.entity';
import type { UserDirectory } from '../../src/modules/rbac/application/user-directory.service';

test('手机端或电脑端现价不大于零时商品不能上架', async () => {
  for (const invalidPrices of [{ priceFen: 0 }, { pcPriceFen: 0 }]) {
    const product = Object.assign(new ProductEntity(), {
      id: 'product-1',
      status: ProductStatus.OffShelf,
      priceFen: 1_000,
      pcPriceFen: 1_500,
      ...invalidPrices,
    });
    const repository = {
      findById: async () => product,
      save: async (entity: ProductEntity) => entity,
    } as unknown as ProductRepository;
    const assembler = {
      assemble: async () => {
        throw new Error('无效价格不应进入视图组装');
      },
    } as unknown as ProductViewAssembler;
    const useCase = new PublishProductUseCase(repository, assembler);

    await assert.rejects(
      useCase.execute(product.id, ProductStatus.OnShelf),
      /手机端和电脑端现价必须大于 0/,
    );
    assert.equal(product.status, ProductStatus.OffShelf);
  }
});

test('已上架商品更新后仍要求两端现价有效，下架草稿允许零价格', async () => {
  for (const status of [ProductStatus.OnShelf, ProductStatus.OffShelf]) {
    const product = Object.assign(new ProductEntity(), {
      id: 'product-1',
      status,
      priceFen: 1_000,
      pcPriceFen: 1_500,
    });
    let saved = false;
    const repository = {
      findById: async () => product,
      save: async (entity: ProductEntity) => {
        saved = true;
        return entity;
      },
    } as unknown as ProductRepository;
    const assembler = {
      assemble: async () => ({ id: product.id }),
    } as unknown as ProductViewAssembler;
    const useCase = new UpdateProductUseCase(
      repository,
      {} as CategoryRepository,
      {} as UserDirectory,
      assembler,
    );

    if (status === ProductStatus.OnShelf) {
      await assert.rejects(
        useCase.execute(product.id, { pcPriceFen: 0 }),
        /手机端和电脑端现价必须大于 0/,
      );
      assert.equal(saved, false);
    } else {
      await assert.doesNotReject(useCase.execute(product.id, { pcPriceFen: 0 }));
      assert.equal(saved, true);
    }
  }
});
