import type { MigrationInterface, QueryRunner } from 'typeorm';

const PAID_ORDER_STATUSES = [
  'pending_service',
  'dispatching',
  'serving',
  'completed',
  'refund_reviewing',
] as const;

/**
 * 把会员累计消费纳入订单支付/退款事务，并以订单字段记录逐单冲正依据。
 * 历史重算要求先停止全部旧版支付写入，具体发布顺序见 docs/deployment.md。
 */
export class AddOrderMemberSpendLedger1784736200000 implements MigrationInterface {
  name = 'AddOrderMemberSpendLedger1784736200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE "service_order" IN ACCESS EXCLUSIVE MODE');
    await queryRunner.query('LOCK TABLE "member_profile" IN ACCESS EXCLUSIVE MODE');
    await queryRunner.query(`
      ALTER TABLE "service_order"
      ADD COLUMN "member_spend_recorded" boolean NOT NULL DEFAULT false
    `);

    const statuses = PAID_ORDER_STATUSES.map((status) => `'${status}'`).join(', ');
    await queryRunner.query(`
      UPDATE "member_profile" AS profile
      SET "spend_fen" = COALESCE((
        SELECT SUM("amount_fen")
        FROM "service_order" AS service_order
        WHERE service_order."tenant_id" = profile."tenant_id"
          AND service_order."user_id" = profile."user_id"
          AND service_order."status" IN (${statuses})
      ), 0),
      "updated_at" = now(),
      "version" = profile."version" + 1
    `);
    await queryRunner.query(`
      INSERT INTO "member_profile" (
        "tenant_id", "user_id", "spend_fen"
      )
      SELECT "tenant_id", "user_id", SUM("amount_fen")
      FROM "service_order"
      WHERE "status" IN (${statuses})
      GROUP BY "tenant_id", "user_id"
      ON CONFLICT ("tenant_id", "user_id") DO NOTHING
    `);
    await queryRunner.query(`
      UPDATE "service_order"
      SET "member_spend_recorded" = true
      WHERE "status" IN (${statuses}) AND "amount_fen" > 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE "service_order" IN ACCESS EXCLUSIVE MODE');
    await queryRunner.query('LOCK TABLE "service_order_refund" IN SHARE MODE');
    const [refundState] = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM "service_order"
        WHERE "status" IN ('refund_reviewing', 'refunded')
      ) AS "has_refund_order"
    `)) as Array<{ has_refund_order: boolean }>;
    const [refundRecords] = (await queryRunner.query(`
      SELECT EXISTS (SELECT 1 FROM "service_order_refund") AS "has_refund_record"
    `)) as Array<{ has_refund_record: boolean }>;
    if (refundState?.has_refund_order || refundRecords?.has_refund_record) {
      throw new Error(
        'Cannot remove service_order.member_spend_recorded after refund business data exists',
      );
    }
    await queryRunner.query(`
      ALTER TABLE "service_order"
      DROP COLUMN "member_spend_recorded"
    `);
  }
}
