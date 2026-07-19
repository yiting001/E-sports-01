import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 增加由打手本人维护的持久化接单状态，历史数据安全默认为下线。 */
export class AddBoosterAvailability1784419200000 implements MigrationInterface {
  name = 'AddBoosterAvailability1784419200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        ADD COLUMN "accepting_orders" boolean NOT NULL DEFAULT false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        DROP COLUMN "accepting_orders"
    `);
  }
}
