import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 角色软删除：rbac_role 增加 deleted_at；租户内编码唯一约束改为只作用于未删除行，
 * 使软删除后可重新创建同编码角色。历史唯一索引由 synchronize 生成、名称为哈希，按列定义动态查找后删除。
 */
export class AddRbacRoleSoftDelete1786300000000 implements MigrationInterface {
  name = 'AddRbacRoleSoftDelete1786300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rbac_role" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      DO $$
      DECLARE legacy_index text;
      BEGIN
        SELECT i.relname INTO legacy_index
        FROM pg_index x
        JOIN pg_class c ON c.oid = x.indrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_class i ON i.oid = x.indexrelid
        WHERE n.nspname = current_schema()
          AND c.relname = 'rbac_role'
          AND x.indisunique
          AND NOT x.indisprimary
          AND x.indpred IS NULL
          AND (
            SELECT array_agg(a.attname::text ORDER BY a.attname)
            FROM pg_attribute a
            WHERE a.attrelid = c.oid AND a.attnum = ANY (x.indkey)
          ) = ARRAY['code', 'tenant_id']
        LIMIT 1;
        IF legacy_index IS NOT NULL THEN
          EXECUTE format('DROP INDEX %I', legacy_index);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_rbac_role_tenant_code_alive"
        ON "rbac_role" ("tenant_id", "code")
        WHERE "deleted_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "rbac_role" WHERE "deleted_at" IS NOT NULL`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_rbac_role_tenant_code_alive"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_rbac_role_tenant_code" ON "rbac_role" ("tenant_id", "code")
    `);
    await queryRunner.query(`ALTER TABLE "rbac_role" DROP COLUMN IF EXISTS "deleted_at"`);
  }
}
