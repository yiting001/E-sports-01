import type { MigrationInterface, QueryRunner } from 'typeorm';
import { acquireTransactionMigrationLock } from '../migration-lock';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const MIGRATION_LOCK_NAME = '1784995200000-add-tenant-config-overrides';

/** 为五个站点展示配置增加租户覆盖表，平台配置仍保留在 sys_config。 */
export class AddTenantConfigOverrides1784995200000 implements MigrationInterface {
  name = 'AddTenantConfigOverrides1784995200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.acquireMigrationLock(queryRunner);
    await queryRunner.query(`
      CREATE TABLE "sys_tenant_config_override" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "tenant_id" uuid NOT NULL,
        "key" varchar(128) NOT NULL,
        "value" text NOT NULL,
        CONSTRAINT "PK_sys_tenant_config_override" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sys_tenant_config_override_tenant_key"
          UNIQUE ("tenant_id", "key"),
        CONSTRAINT "FK_sys_tenant_config_override_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_sys_tenant_config_override_key"
          FOREIGN KEY ("key") REFERENCES "sys_config"("key")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sys_tenant_config_override_tenant"
        ON "sys_tenant_config_override" ("tenant_id")
    `);
    await queryRunner.query(`
      DO $grants$
      DECLARE
        source_grant record;
        grantee_sql text;
        source_owner text;
      BEGIN
        SELECT "tableowner"
        INTO source_owner
        FROM pg_tables
        WHERE "schemaname" = current_schema()
          AND "tablename" = 'sys_config';

        IF source_owner IS NULL THEN
          RAISE EXCEPTION 'cannot resolve owner of sys_config';
        END IF;

        EXECUTE format(
          'ALTER TABLE %I.%I OWNER TO %I',
          current_schema(),
          'sys_tenant_config_override',
          source_owner
        );

        FOR source_grant IN
          SELECT "grantee", "privilege_type", "is_grantable"
          FROM information_schema.table_privileges
          WHERE "table_schema" = current_schema()
            AND "table_name" = 'sys_config'
            AND "privilege_type" IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        LOOP
          grantee_sql := CASE
            WHEN source_grant."grantee" = 'PUBLIC' THEN 'PUBLIC'
            ELSE quote_ident(source_grant."grantee")
          END;
          EXECUTE format(
            'GRANT %s ON TABLE %I.%I TO %s%s',
            source_grant."privilege_type",
            current_schema(),
            'sys_tenant_config_override',
            grantee_sql,
            CASE
              WHEN source_grant."is_grantable" = 'YES' THEN ' WITH GRANT OPTION'
              ELSE ''
            END
          );
        END LOOP;
      END
      $grants$
    `);

    // 子租户复制当前生效值以保持升级行为；默认租户继续跟随平台全局值。
    await queryRunner.query('LOCK TABLE "sys_tenant" IN SHARE MODE');
    await queryRunner.query('LOCK TABLE "sys_config" IN SHARE MODE');
    await queryRunner.query(
      `
      INSERT INTO "sys_tenant_config_override" (
        "id", "created_at", "updated_at", "version", "tenant_id", "key", "value"
      )
      SELECT gen_random_uuid(), now(), now(), 1, tenant."id", config."key", config."value"
      FROM "sys_tenant" tenant
      CROSS JOIN "sys_config" config
      WHERE tenant."id" <> $1
        AND config."key" IN (
        'system.appName',
        'system.appLogo',
        'portal.homeBanner',
        'portal.showRank',
        'auth.userAgreement'
      )
      ON CONFLICT ("tenant_id", "key") DO NOTHING
    `,
      [DEFAULT_TENANT_ID],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.acquireMigrationLock(queryRunner);
    await queryRunner.query(`
      LOCK TABLE "sys_config" IN SHARE ROW EXCLUSIVE MODE;
      LOCK TABLE "sys_tenant_config_override" IN ACCESS EXCLUSIVE MODE;
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "sys_tenant_config_override" override
          LEFT JOIN "sys_config" config ON config."key" = override."key"
          WHERE config."key" IS NULL
        ) THEN
          RAISE EXCEPTION
            'Cannot rollback: tenant config override contains a key missing from sys_config';
        END IF;

        IF EXISTS (
          SELECT config."key"
          FROM "sys_config" config
          CROSS JOIN "sys_tenant" tenant
          LEFT JOIN "sys_tenant_config_override" override
            ON override."tenant_id" = tenant."id"
           AND override."key" = config."key"
          WHERE config."key" IN (
            'system.appName',
            'system.appLogo',
            'portal.homeBanner',
            'portal.showRank',
            'auth.userAgreement'
          )
          GROUP BY config."key"
          HAVING COUNT(DISTINCT COALESCE(override."value", config."value")) > 1
        ) THEN
          RAISE EXCEPTION
            'Cannot rollback: tenant config values have diverged and cannot be collapsed safely';
        END IF;
      END
      $migration$;

      WITH effective AS (
        SELECT
          config."key",
          COALESCE(override."value", config."value") AS "value"
        FROM "sys_config" config
        CROSS JOIN "sys_tenant" tenant
        LEFT JOIN "sys_tenant_config_override" override
          ON override."tenant_id" = tenant."id"
         AND override."key" = config."key"
        WHERE config."key" IN (
          'system.appName',
          'system.appLogo',
          'portal.homeBanner',
          'portal.showRank',
          'auth.userAgreement'
        )
      ), collapsed AS (
        SELECT "key", MIN("value") AS "value"
        FROM effective
        GROUP BY "key"
      )
      UPDATE "sys_config" config
      SET
        "value" = collapsed."value",
        "updated_at" = now(),
        "version" = config."version" + 1
      FROM collapsed
      WHERE config."key" = collapsed."key";

      DROP TABLE "sys_tenant_config_override";
    `);
  }

  private async acquireMigrationLock(queryRunner: QueryRunner): Promise<void> {
    if (!queryRunner.isTransactionActive) {
      throw new Error(`${MIGRATION_LOCK_NAME} must run inside a transaction`);
    }
    await acquireTransactionMigrationLock(queryRunner, MIGRATION_LOCK_NAME);
  }
}
