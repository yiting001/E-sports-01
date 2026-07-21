import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 增加投诉与真实订单/打手的结构化关联，以及反馈级唯一处罚链路。 */
export class AddFeedbackDirectPenalty1784641800000 implements MigrationInterface {
  name = 'AddFeedbackDirectPenalty1784641800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "feedback"
        ADD COLUMN "order_id" varchar(36) NOT NULL DEFAULT '',
        ADD COLUMN "order_no" varchar(64) NOT NULL DEFAULT '',
        ADD COLUMN "booster_user_id" varchar(36) NOT NULL DEFAULT '',
        ADD COLUMN "booster_name" varchar(64) NOT NULL DEFAULT '',
        ADD COLUMN "penalty_id" varchar(36)
    `);
    await queryRunner.query(`
      ALTER TABLE "booster_penalty"
        ADD COLUMN "feedback_id" varchar(36)
    `);
    await queryRunner.query(`
      UPDATE "feedback" AS feedback
      SET
        "order_id" = service_order."id",
        "order_no" = service_order."order_no",
        "booster_user_id" = service_order."booster_id",
        "booster_name" = service_order."booster_name"
      FROM "service_order"
      WHERE feedback."type" = 'booster'
        AND feedback."tenant_id" = service_order."tenant_id"
        AND feedback."userId" = service_order."user_id"
        AND btrim(feedback."target") = service_order."order_no"
        AND service_order."booster_id" <> ''
        AND service_order."booster_name" <> ''
        AND service_order."status" IN ('serving', 'completed')
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_feedback_order_id"
        ON "feedback" ("order_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_feedback_penalty_id"
        ON "feedback" ("penalty_id")
        WHERE "penalty_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_booster_penalty_feedback_id"
        ON "booster_penalty" ("feedback_id")
        WHERE "feedback_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_booster_penalty_feedback_id"');
    await queryRunner.query('DROP INDEX "UQ_feedback_penalty_id"');
    await queryRunner.query('DROP INDEX "IDX_feedback_order_id"');
    await queryRunner.query(`
      ALTER TABLE "booster_penalty"
        DROP COLUMN "feedback_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "feedback"
        DROP COLUMN "penalty_id",
        DROP COLUMN "booster_name",
        DROP COLUMN "booster_user_id",
        DROP COLUMN "order_no",
        DROP COLUMN "order_id"
    `);
  }
}
