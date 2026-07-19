import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 为新版打手入驻表单增加结构化资料字段。
 * 旧三列保留并设置空串默认值，保证历史数据可读和 down 后仍可运行。
 */
export class AddBoosterOnboardingFields1784246400000 implements MigrationInterface {
  name = 'AddBoosterOnboardingFields1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        ALTER COLUMN "game_nickname" SET DEFAULT '',
        ALTER COLUMN "game_name" SET DEFAULT '',
        ALTER COLUMN "rank" SET DEFAULT '',
        ADD COLUMN "applicant_name" varchar(64) NOT NULL DEFAULT '',
        ADD COLUMN "gender" varchar(16) NOT NULL DEFAULT '',
        ADD COLUMN "service_regions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN "contact_type" varchar(16) NOT NULL DEFAULT '',
        ADD COLUMN "contact_value" varchar(128) NOT NULL DEFAULT '',
        ADD COLUMN "material_image" varchar(2048) NOT NULL DEFAULT '',
        ADD COLUMN "invitation_code" varchar(64) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      UPDATE "booster_application"
      SET
        "applicant_name" = "game_nickname",
        "service_regions" = CASE
          WHEN "game_name" IN ('delta-mobile', 'delta-pc') THEN jsonb_build_array("game_name")
          ELSE '[]'::jsonb
        END
    `);
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        ADD CONSTRAINT "CHK_booster_application_gender"
          CHECK ("gender" IN ('', 'male', 'female')),
        ADD CONSTRAINT "CHK_booster_application_contact_type"
          CHECK ("contact_type" IN ('', 'phone', 'wechat', 'qq')),
        ADD CONSTRAINT "CHK_booster_application_service_regions_array"
          CHECK (
            jsonb_typeof("service_regions") = 'array'
            AND jsonb_array_length("service_regions") <= 2
            AND "service_regions" <@ '["delta-mobile", "delta-pc"]'::jsonb
          )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        DROP CONSTRAINT "CHK_booster_application_service_regions_array",
        DROP CONSTRAINT "CHK_booster_application_contact_type",
        DROP CONSTRAINT "CHK_booster_application_gender",
        DROP COLUMN "invitation_code",
        DROP COLUMN "material_image",
        DROP COLUMN "contact_value",
        DROP COLUMN "contact_type",
        DROP COLUMN "service_regions",
        DROP COLUMN "gender",
        DROP COLUMN "applicant_name",
        ALTER COLUMN "rank" DROP DEFAULT,
        ALTER COLUMN "game_name" DROP DEFAULT,
        ALTER COLUMN "game_nickname" DROP DEFAULT
    `);
  }
}
