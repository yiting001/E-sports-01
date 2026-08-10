import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 接单区服选项改为管理端可视化配置（booster.serviceRegionOptions），
 * 数据库约束不再固定枚举两个区服值：仅保留数组类型检查
 *（CHECK 不支持子查询，元素内容由应用层按配置校验）。
 */
export class RelaxBoosterServiceRegionsCheck1786000000000 implements MigrationInterface {
  name = 'RelaxBoosterServiceRegionsCheck1786000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        DROP CONSTRAINT "CHK_booster_application_service_regions_array",
        ADD CONSTRAINT "CHK_booster_application_service_regions_array"
          CHECK (jsonb_typeof("service_regions") = 'array')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booster_application"
        DROP CONSTRAINT "CHK_booster_application_service_regions_array",
        ADD CONSTRAINT "CHK_booster_application_service_regions_array"
          CHECK (
            jsonb_typeof("service_regions") = 'array'
            AND jsonb_array_length("service_regions") <= 2
            AND "service_regions" <@ '["delta-mobile", "delta-pc"]'::jsonb
          )
    `);
  }
}
