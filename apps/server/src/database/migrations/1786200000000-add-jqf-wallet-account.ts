import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 新增计全付钱包开户记录表：每用户每租户至多一条，
 * mchOrderNo 为向计全付发起开户的全局幂等单号，channelState 跟踪渠道开户状态。
 */
export class AddJqfWalletAccount1786200000000 implements MigrationInterface {
  name = 'AddJqfWalletAccount1786200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "jqf_wallet_account" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "tenant_id" character varying(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
        "user_id" character varying(36) NOT NULL,
        "mch_order_no" character varying(64) NOT NULL,
        "wallet_id" character varying(64) NOT NULL DEFAULT '',
        "channel_state" integer NOT NULL DEFAULT 0,
        "err_msg" character varying(255) NOT NULL DEFAULT '',
        "synced_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_jqf_wallet_account" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_jqf_wallet_account_user" UNIQUE ("tenant_id", "user_id"),
        CONSTRAINT "UQ_jqf_wallet_account_order" UNIQUE ("mch_order_no")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_jqf_wallet_account_tenant" ON "jqf_wallet_account" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_jqf_wallet_account_user" ON "jqf_wallet_account" ("user_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "jqf_wallet_account"`);
  }
}
