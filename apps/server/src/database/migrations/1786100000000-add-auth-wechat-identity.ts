import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 新增微信公众号登录身份表：租户内 openid 唯一（登录路由依据），
 * 且一个账号只保留一条公众号身份，供公众号登录与 JSAPI 支付取 openid。
 */
export class AddAuthWechatIdentity1786100000000 implements MigrationInterface {
  name = 'AddAuthWechatIdentity1786100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_wechat_identity" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "tenant_id" character varying(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
        "user_id" character varying(36) NOT NULL,
        "openid" character varying(64) NOT NULL,
        CONSTRAINT "PK_auth_wechat_identity" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_wechat_identity_openid" UNIQUE ("tenant_id", "openid"),
        CONSTRAINT "UQ_auth_wechat_identity_user" UNIQUE ("tenant_id", "user_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_wechat_identity_tenant" ON "auth_wechat_identity" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_wechat_identity_user" ON "auth_wechat_identity" ("user_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_wechat_identity"`);
  }
}
