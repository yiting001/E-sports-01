import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 增加打手公开语音，以及下单账号、区服和指定打手快照。 */
export class AddBoosterDirectoryOrderSelection1784332800000 implements MigrationInterface {
  name = 'AddBoosterDirectoryOrderSelection1784332800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        ADD COLUMN "voice_url" varchar(2048) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "service_order"
        ADD COLUMN "game_account_id" varchar(32) NOT NULL DEFAULT '',
        ADD COLUMN "game_text_id" varchar(64) NOT NULL DEFAULT '',
        ADD COLUMN "service_region" varchar(32) NOT NULL DEFAULT '',
        ADD COLUMN "booster_selection_mode" varchar(16) NOT NULL DEFAULT 'auto',
        ADD COLUMN "requested_booster_id" varchar(36) NOT NULL DEFAULT '',
        ADD COLUMN "requested_booster_name" varchar(64) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "service_order"
        ADD CONSTRAINT "CHK_service_order_game_account_id"
          CHECK ("game_account_id" = '' OR "game_account_id" ~ '^[0-9]{1,32}$'),
        ADD CONSTRAINT "CHK_service_order_service_region"
          CHECK ("service_region" IN ('', 'delta-mobile', 'delta-pc')),
        ADD CONSTRAINT "CHK_service_order_booster_selection"
          CHECK (
            ("booster_selection_mode" = 'auto' AND "requested_booster_id" = '')
            OR
            ("booster_selection_mode" = 'specified' AND "requested_booster_id" <> '')
          )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_booster_directory"
        ON "booster_application" ("tenant_id", "status", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_service_order_requested_booster"
        ON "service_order" ("tenant_id", "requested_booster_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_service_order_requested_booster"');
    await queryRunner.query('DROP INDEX "IDX_booster_directory"');
    await queryRunner.query(`
      ALTER TABLE "service_order"
        DROP CONSTRAINT "CHK_service_order_booster_selection",
        DROP CONSTRAINT "CHK_service_order_service_region",
        DROP CONSTRAINT "CHK_service_order_game_account_id",
        DROP COLUMN "requested_booster_name",
        DROP COLUMN "requested_booster_id",
        DROP COLUMN "booster_selection_mode",
        DROP COLUMN "service_region",
        DROP COLUMN "game_text_id",
        DROP COLUMN "game_account_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        DROP COLUMN "voice_url"
    `);
  }
}
