import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';

import { CategoryEntity } from './domain/category.entity';
import { ProductEntity } from './domain/product.entity';
import { CATEGORY_REPOSITORY } from './domain/category-repository.interface';
import { PRODUCT_REPOSITORY } from './domain/product-repository.interface';

import { TypeormCategoryRepository } from './infrastructure/category.repository';
import { TypeormProductRepository } from './infrastructure/product.repository';
import {
  PRODUCT_SALES_TRANSACTION_PARTICIPANT,
  TypeormProductSalesTransactionParticipant,
} from './infrastructure/product-sales-transaction.participant';

import { ProductViewAssembler } from './application/product-view.assembler';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.usecase';
import { CreateCategoryUseCase } from './application/use-cases/create-category.usecase';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.usecase';
import { RemoveCategoryUseCase } from './application/use-cases/remove-category.usecase';
import { ListPublicCategoriesUseCase } from './application/use-cases/list-public-categories.usecase';
import { ListProductsUseCase } from './application/use-cases/list-products.usecase';
import { CreateProductUseCase } from './application/use-cases/create-product.usecase';
import { UpdateProductUseCase } from './application/use-cases/update-product.usecase';
import { RemoveProductUseCase } from './application/use-cases/remove-product.usecase';
import { PublishProductUseCase } from './application/use-cases/publish-product.usecase';
import { ListPublicProductsUseCase } from './application/use-cases/list-public-products.usecase';
import { GetPublicProductUseCase } from './application/use-cases/get-public-product.usecase';
import { ListServiceAgentsUseCase } from './application/use-cases/list-service-agents.usecase';

import { CategoryListController } from './interfaces/controllers/category.list.controller';
import { CategoryCreateController } from './interfaces/controllers/category.create.controller';
import { CategoryUpdateController } from './interfaces/controllers/category.update.controller';
import { CategoryRemoveController } from './interfaces/controllers/category.remove.controller';
import { CategoryPublicListController } from './interfaces/controllers/category.public-list.controller';
import { ProductListController } from './interfaces/controllers/product.list.controller';
import { ProductCreateController } from './interfaces/controllers/product.create.controller';
import { ProductUpdateController } from './interfaces/controllers/product.update.controller';
import { ProductRemoveController } from './interfaces/controllers/product.remove.controller';
import { ProductPublishController } from './interfaces/controllers/product.publish.controller';
import { ProductPublicListController } from './interfaces/controllers/product.public-list.controller';
import { ProductPublicDetailController } from './interfaces/controllers/product.public-detail.controller';
import { ServiceAgentListController } from './interfaces/controllers/service-agent.list.controller';

/**
 * 电竞商品模块。
 * DDD 四层：分类（Category）与商品（Product）两个聚合根；
 * 管理端提供分类/商品 CRUD 与上下架、关联负责客服；C 端提供只读的分类与上架商品查询。
 * 表结构经 TypeORM synchronize 自动建立，无需手写迁移。
 */
@Module({
  imports: [RbacModule, TypeOrmModule.forFeature([CategoryEntity, ProductEntity])],
  controllers: [
    CategoryListController,
    CategoryCreateController,
    CategoryUpdateController,
    CategoryRemoveController,
    CategoryPublicListController,
    ProductListController,
    ProductCreateController,
    ProductUpdateController,
    ProductRemoveController,
    ProductPublishController,
    ProductPublicListController,
    ProductPublicDetailController,
    ServiceAgentListController,
  ],
  providers: [
    { provide: CATEGORY_REPOSITORY, useClass: TypeormCategoryRepository },
    { provide: PRODUCT_REPOSITORY, useClass: TypeormProductRepository },
    {
      provide: PRODUCT_SALES_TRANSACTION_PARTICIPANT,
      useClass: TypeormProductSalesTransactionParticipant,
    },
    ProductViewAssembler,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    RemoveCategoryUseCase,
    ListPublicCategoriesUseCase,
    ListProductsUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    RemoveProductUseCase,
    PublishProductUseCase,
    ListPublicProductsUseCase,
    GetPublicProductUseCase,
    ListServiceAgentsUseCase,
  ],
  // 导出商品仓储供订单模块下单时校验商品/固化快照
  exports: [PRODUCT_REPOSITORY, PRODUCT_SALES_TRANSACTION_PARTICIPANT],
})
export class CommerceModule {}
