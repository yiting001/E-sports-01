import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 新增主题特效配置表：每租户一条记录，保存 C 端启用的 Canvas UI 背景特效列表 */
export class AddThemeEffectSetting1785800000000 implements MigrationInterface {
  name = 'AddThemeEffectSetting1785800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "theme_effect_setting" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "tenant_id" character varying(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
        "effects" text NOT NULL DEFAULT '[]',
        CONSTRAINT "PK_theme_effect_setting" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_theme_effect_setting_tenant" ON "theme_effect_setting" ("tenant_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "theme_effect_setting"`);
  }
}
