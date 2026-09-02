import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 放开租户内角色编码唯一约束：同租户可存在多个同编码角色（各自独立授权、分别绑定用户），
 * 编码仅表达内置语义与分类；保留普通索引供按编码查询。
 */
export class DropRbacRoleCodeUnique1786400000000 implements MigrationInterface {
  name = 'DropRbacRoleCodeUnique1786400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_rbac_role_tenant_code_alive"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rbac_role_tenant_code" ON "rbac_role" ("tenant_id", "code")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rbac_role_tenant_code"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_rbac_role_tenant_code_alive"
        ON "rbac_role" ("tenant_id", "code")
        WHERE "deleted_at" IS NULL
    `);
  }
}
