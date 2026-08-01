import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 新增用户微信通知绑定表：租户内每用户每渠道（小程序/公众号）一条 openid 绑定，
 * 供订单微信通知按绑定推送。
 */
export class AddNotifyWechatBinding1785900000000 implements MigrationInterface {
  name = 'AddNotifyWechatBinding1785900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notify_wechat_binding" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "tenant_id" character varying(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
        "user_id" character varying(36) NOT NULL,
        "channel" character varying(16) NOT NULL,
        "openid" character varying(64) NOT NULL,
        CONSTRAINT "PK_notify_wechat_binding" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notify_wechat_binding_user_channel"
          UNIQUE ("tenant_id", "user_id", "channel")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notify_wechat_binding_tenant" ON "notify_wechat_binding" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notify_wechat_binding_user" ON "notify_wechat_binding" ("user_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notify_wechat_binding"`);
  }
}
