import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 增加一单一申请的订单全额退款审核表；订单状态列为 varchar，无需改枚举类型。 */
export class AddOrderRefundReview1784736000000 implements MigrationInterface {
  name = 'AddOrderRefundReview1784736000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_order_refund" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "tenant_id" varchar(36) NOT NULL,
        "order_id" uuid NOT NULL,
        "user_id" varchar(36) NOT NULL,
        "refund_no" varchar(64) NOT NULL,
        "amount_fen" bigint NOT NULL,
        "payment_method" varchar(16) NOT NULL,
        "source_order_status" varchar(24) NOT NULL,
        "reason" varchar(500) NOT NULL,
        "status" varchar(24) NOT NULL DEFAULT 'pending_review',
        "provider_refund_no" varchar(128) NOT NULL DEFAULT '',
        "reviewer_id" varchar(36) NOT NULL DEFAULT '',
        "reviewed_at" timestamptz,
        "reject_reason" varchar(500) NOT NULL DEFAULT '',
        "fail_reason" varchar(500) NOT NULL DEFAULT '',
        "refunded_at" timestamptz,
        CONSTRAINT "PK_service_order_refund" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_service_order_refund_order" UNIQUE ("order_id"),
        CONSTRAINT "UQ_service_order_refund_no" UNIQUE ("refund_no"),
        CONSTRAINT "FK_service_order_refund_order"
          FOREIGN KEY ("order_id") REFERENCES "service_order"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_service_order_refund_amount" CHECK ("amount_fen" >= 0),
        CONSTRAINT "CHK_service_order_refund_source_status"
          CHECK ("source_order_status" IN ('pending_service', 'dispatching')),
        CONSTRAINT "CHK_service_order_refund_status"
          CHECK ("status" IN ('pending_review', 'processing', 'succeeded', 'rejected', 'failed'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_service_order_refund_tenant"
        ON "service_order_refund" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_service_order_refund_user"
        ON "service_order_refund" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_service_order_refund_tenant_status"
        ON "service_order_refund" ("tenant_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_service_order_refund_tenant_user"
        ON "service_order_refund" ("tenant_id", "user_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      LOCK TABLE "service_order" IN SHARE MODE;
      LOCK TABLE "service_order_refund" IN ACCESS EXCLUSIVE MODE;
      DO $migration$
      BEGIN
        IF EXISTS (SELECT 1 FROM "service_order_refund" LIMIT 1) THEN
          RAISE EXCEPTION
            'Cannot rollback: service_order_refund contains financial audit records';
        END IF;
        IF EXISTS (
          SELECT 1
          FROM "service_order"
          WHERE "status" IN ('refund_reviewing', 'refunded')
          LIMIT 1
        ) THEN
          RAISE EXCEPTION
            'Cannot rollback: service_order contains refund_reviewing or refunded orders';
        END IF;
      END
      $migration$;
      DROP TABLE "service_order_refund";
    `);
  }
}
