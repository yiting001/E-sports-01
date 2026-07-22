import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ProductEntity } from '../domain/product.entity';

export const PRODUCT_SALES_TRANSACTION_PARTICIPANT = Symbol(
  'PRODUCT_SALES_TRANSACTION_PARTICIPANT',
);

export interface RollbackProductSalesInput {
  tenantId: string;
  productId: string;
  quantity: number;
}

/** 供退款等跨聚合事务使用的商品销量窄写端口。 */
export interface ProductSalesTransactionParticipant {
  rollback(manager: EntityManager, input: RollbackProductSalesInput): Promise<void>;
}

@Injectable()
export class TypeormProductSalesTransactionParticipant
  implements ProductSalesTransactionParticipant
{
  async rollback(manager: EntityManager, input: RollbackProductSalesInput): Promise<void> {
    if (input.quantity <= 0) {
      return;
    }
    await manager
      .createQueryBuilder()
      .update(ProductEntity)
      .set({ sold: () => 'GREATEST("sold" - :quantity, 0)' })
      .where('"id" = :productId AND "tenant_id" = :tenantId', input)
      .setParameter('quantity', input.quantity)
      .execute();
  }
}
