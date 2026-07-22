import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 分离业务退款号与渠道尝试号，并保留每次外部渠道退款的财务审计。 */
export class AddOrderRefundChannelAttempt1784736100000 implements MigrationInterface {
  name = 'AddOrderRefundChannelAttempt1784736100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_order_refund"
        ADD COLUMN "channel_refund_no" varchar(64) NOT NULL DEFAULT '',
        ADD COLUMN "attempt" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "service_order_refund"
      SET "channel_refund_no" = "refund_no", "attempt" = 1
      WHERE "status" IN ('processing', 'succeeded', 'failed')
        AND "payment_method" <> 'balance'
        AND "amount_fen" > 0
    `);
    await queryRunner.query(`
      ALTER TABLE "service_order_refund"
        ADD CONSTRAINT "CHK_service_order_refund_attempt"
        CHECK (
          ("attempt" = 0 AND "channel_refund_no" = '') OR
          ("attempt" > 0 AND "channel_refund_no" <> '')
        )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_service_order_refund_channel_no"
        ON "service_order_refund" ("channel_refund_no")
        WHERE "channel_refund_no" <> ''
    `);
    await queryRunner.query(`
      CREATE TABLE "service_order_refund_attempt" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "tenant_id" varchar(36) NOT NULL,
        "refund_id" uuid NOT NULL,
        "attempt" integer NOT NULL,
        "channel_refund_no" varchar(64) NOT NULL,
        "reviewer_id" varchar(36) NOT NULL,
        "provider_refund_no" varchar(128) NOT NULL DEFAULT '',
        "status" varchar(24) NOT NULL DEFAULT 'processing',
        "fail_reason" varchar(500) NOT NULL DEFAULT '',
        "started_at" timestamptz NOT NULL,
        "finished_at" timestamptz,
        CONSTRAINT "PK_service_order_refund_attempt" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_service_order_refund_attempt_sequence" UNIQUE ("refund_id", "attempt"),
        CONSTRAINT "UQ_service_order_refund_attempt_channel_no" UNIQUE ("channel_refund_no"),
        CONSTRAINT "FK_service_order_refund_attempt_refund"
          FOREIGN KEY ("refund_id") REFERENCES "service_order_refund"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_service_order_refund_attempt_number" CHECK ("attempt" > 0),
        CONSTRAINT "CHK_service_order_refund_attempt_status"
          CHECK ("status" IN ('processing', 'succeeded', 'failed'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_service_order_refund_attempt_tenant"
        ON "service_order_refund_attempt" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_service_order_refund_attempt_tenant_refund"
        ON "service_order_refund_attempt" ("tenant_id", "refund_id")
    `);
    await queryRunner.query(`
      INSERT INTO "service_order_refund_attempt" (
        "tenant_id", "refund_id", "attempt", "channel_refund_no", "reviewer_id",
        "provider_refund_no", "status", "fail_reason", "started_at", "finished_at",
        "created_at", "updated_at"
      )
      SELECT
        "tenant_id",
        "id",
        1,
        "refund_no",
        "reviewer_id",
        "provider_refund_no",
        "status",
        CASE WHEN "status" = 'failed' THEN "fail_reason" ELSE '' END,
        COALESCE("reviewed_at", "created_at"),
        CASE
          WHEN "status" = 'succeeded' THEN COALESCE("refunded_at", "updated_at")
          WHEN "status" = 'failed' THEN "updated_at"
          ELSE NULL
        END,
        COALESCE("reviewed_at", "created_at"),
        "updated_at"
      FROM "service_order_refund"
      WHERE "status" IN ('processing', 'succeeded', 'failed')
        AND "payment_method" <> 'balance'
        AND "amount_fen" > 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      LOCK TABLE "service_order_refund" IN ACCESS EXCLUSIVE MODE;
      LOCK TABLE "service_order_refund_attempt" IN ACCESS EXCLUSIVE MODE;
      DO $migration$
      BEGIN
        IF EXISTS (SELECT 1 FROM "service_order_refund_attempt" LIMIT 1) OR
          EXISTS (
            SELECT 1 FROM "service_order_refund"
            WHERE "attempt" <> 0 OR "channel_refund_no" <> ''
            LIMIT 1
          ) THEN
          RAISE EXCEPTION
            '退款渠道尝试审计非空，拒绝回滚；请先完成财务审计归档';
        END IF;
      END
      $migration$;
      DROP TABLE "service_order_refund_attempt";
      DROP INDEX "UQ_service_order_refund_channel_no";
      ALTER TABLE "service_order_refund"
        DROP CONSTRAINT "CHK_service_order_refund_attempt";
      ALTER TABLE "service_order_refund"
        DROP COLUMN "attempt",
        DROP COLUMN "channel_refund_no";
    `);
  }
}
