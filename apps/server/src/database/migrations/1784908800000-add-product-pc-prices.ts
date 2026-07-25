import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 为商品增加电脑端价格，并以原手机端价格无损初始化历史商品。 */
export class AddProductPcPrices1784908800000 implements MigrationInterface {
  name = 'AddProductPcPrices1784908800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE "commerce_product" IN ACCESS EXCLUSIVE MODE');
    const [state] = (await queryRunner.query(`
      SELECT COUNT(*)::integer AS "invalid_count"
      FROM "commerce_product"
      WHERE "status" = 'on_shelf'
        AND "price_fen" <= 0
    `)) as Array<{ invalid_count: number }>;
    if ((state?.invalid_count ?? 0) > 0) {
      throw new Error(
        `Cannot initialize platform pricing: ${state?.invalid_count ?? 0} on-shelf products have non-positive mobile prices`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE "commerce_product"
        ADD COLUMN "pc_price_fen" integer,
        ADD COLUMN "pc_origin_price_fen" integer
    `);
    await queryRunner.query(`
      UPDATE "commerce_product"
      SET
        "pc_price_fen" = "price_fen",
        "pc_origin_price_fen" = "origin_price_fen"
    `);
    await queryRunner.query(`
      ALTER TABLE "commerce_product"
        ALTER COLUMN "pc_price_fen" SET DEFAULT 0,
        ALTER COLUMN "pc_price_fen" SET NOT NULL,
        ALTER COLUMN "pc_origin_price_fen" SET DEFAULT 0,
        ALTER COLUMN "pc_origin_price_fen" SET NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE "commerce_product" IN ACCESS EXCLUSIVE MODE');
    const [state] = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1
        FROM "commerce_product"
        WHERE "pc_price_fen" <> "price_fen"
           OR "pc_origin_price_fen" <> "origin_price_fen"
      ) AS "has_distinct_prices"
    `)) as Array<{ has_distinct_prices: boolean }>;
    if (state?.has_distinct_prices) {
      throw new Error('Cannot remove distinct platform pricing from commerce_product');
    }
    await queryRunner.query(`
      ALTER TABLE "commerce_product"
        DROP COLUMN "pc_origin_price_fen",
        DROP COLUMN "pc_price_fen"
    `);
  }
}
