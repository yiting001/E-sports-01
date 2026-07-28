\set ON_ERROR_STOP on

BEGIN;

-- 与 TypeORM migration 使用同一事务级互斥键；有界轮询避免并发发布永久挂起。
DO $migration_lock$
DECLARE
  lock_deadline timestamptz := clock_timestamp() + interval '30 seconds';
BEGIN
  LOOP
    EXIT WHEN pg_try_advisory_xact_lock(
      hashtext('1784995200000-add-tenant-config-overrides')
    );
    IF clock_timestamp() >= lock_deadline THEN
      RAISE EXCEPTION 'timed out after 30 seconds waiting for the migration lock'
        USING ERRCODE = '55P03';
    END IF;
    PERFORM pg_sleep(0.1);
  END LOOP;
END
$migration_lock$;

DO $preflight$
DECLARE
  missing_migrations text;
  history_count bigint;
BEGIN
  IF to_regclass('public.typeorm_migrations') IS NULL THEN
    RAISE EXCEPTION 'missing required migration history table: public.typeorm_migrations';
  END IF;

  SELECT string_agg(required.name, ', ' ORDER BY required.migration_timestamp)
  INTO missing_migrations
  FROM (
    VALUES
      (1784246400000::bigint, 'AddBoosterOnboardingFields1784246400000'),
      (1784332800000::bigint, 'AddBoosterDirectoryOrderSelection1784332800000'),
      (1784419200000::bigint, 'AddBoosterAvailability1784419200000'),
      (1784641800000::bigint, 'AddFeedbackDirectPenalty1784641800000'),
      (1784736000000::bigint, 'AddOrderRefundReview1784736000000'),
      (1784736100000::bigint, 'AddOrderRefundChannelAttempt1784736100000'),
      (1784736200000::bigint, 'AddOrderMemberSpendLedger1784736200000'),
      (1784736300000::bigint, 'RedactImPhoneSystemMessages1784736300000'),
      (1784908800000::bigint, 'AddProductPcPrices1784908800000')
  ) AS required(migration_timestamp, name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.typeorm_migrations AS history
    WHERE history."timestamp" = required.migration_timestamp
      AND history."name" = required.name
  );

  IF missing_migrations IS NOT NULL THEN
    RAISE EXCEPTION 'incomplete migration history; missing: %', missing_migrations;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.typeorm_migrations
    WHERE "timestamp" = 1784995200000
       OR "name" = 'AddTenantConfigOverrides1784995200000'
  ) THEN
    RAISE EXCEPTION 'current migration is already recorded or conflicts with migration history';
  END IF;

  SELECT COUNT(*)
  INTO history_count
  FROM public.typeorm_migrations;

  IF history_count <> 9 THEN
    RAISE EXCEPTION
      'migration history is not the exact trusted prerequisite prefix; expected 9 records, found %',
      history_count;
  END IF;

  IF to_regclass('public.sys_tenant') IS NULL THEN
    RAISE EXCEPTION 'missing required table: public.sys_tenant';
  END IF;

  IF to_regclass('public.sys_config') IS NULL THEN
    RAISE EXCEPTION 'missing required table: public.sys_config';
  END IF;

  IF to_regclass('public.sys_tenant_config_override') IS NOT NULL THEN
    RAISE EXCEPTION
      'public.sys_tenant_config_override already exists; stop and inspect the existing schema';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sys_tenant
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
  ) THEN
    RAISE EXCEPTION 'default tenant is missing';
  END IF;
END
$preflight$;

-- 锁住父表，保证建表和存量租户回填期间租户、配置键和值不会变化。
LOCK TABLE public.sys_tenant IN SHARE MODE;
LOCK TABLE public.sys_config IN SHARE MODE;

CREATE TABLE public.sys_tenant_config_override (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  tenant_id uuid NOT NULL,
  key varchar(128) NOT NULL,
  value text NOT NULL,
  CONSTRAINT "PK_sys_tenant_config_override" PRIMARY KEY (id),
  CONSTRAINT "UQ_sys_tenant_config_override_tenant_key" UNIQUE (tenant_id, key),
  CONSTRAINT "FK_sys_tenant_config_override_tenant"
    FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_sys_tenant_config_override_key"
    FOREIGN KEY (key) REFERENCES public.sys_config(key)
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "IDX_sys_tenant_config_override_tenant"
  ON public.sys_tenant_config_override (tenant_id);

-- 手工脚本通常由 postgres 执行。对齐 sys_config owner 和 CRUD 授权，避免新表仅 DBA 可维护。
DO $grants$
DECLARE
  source_grant record;
  grantee_sql text;
  source_owner text;
BEGIN
  SELECT tableowner
  INTO source_owner
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = 'sys_config';

  IF source_owner IS NULL THEN
    RAISE EXCEPTION 'cannot resolve owner of public.sys_config';
  END IF;

  EXECUTE format(
    'ALTER TABLE public.sys_tenant_config_override OWNER TO %I',
    source_owner
  );

  FOR source_grant IN
    SELECT grantee, privilege_type, is_grantable
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name = 'sys_config'
      AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    grantee_sql := CASE
      WHEN source_grant.grantee = 'PUBLIC' THEN 'PUBLIC'
      ELSE quote_ident(source_grant.grantee)
    END;
    EXECUTE format(
      'GRANT %s ON TABLE public.sys_tenant_config_override TO %s%s',
      source_grant.privilege_type,
      grantee_sql,
      CASE
        WHEN source_grant.is_grantable = 'YES' THEN ' WITH GRANT OPTION'
        ELSE ''
      END
    );
  END LOOP;
END
$grants$;

-- 子租户复制升级前的当前值，默认租户继续读取 sys_config 全局默认值。
INSERT INTO public.sys_tenant_config_override (
  id,
  created_at,
  updated_at,
  version,
  tenant_id,
  key,
  value
)
SELECT
  gen_random_uuid(),
  now(),
  now(),
  1,
  tenant.id,
  config.key,
  config.value
FROM public.sys_tenant AS tenant
CROSS JOIN public.sys_config AS config
WHERE tenant.id <> '00000000-0000-0000-0000-000000000001'::uuid
  AND config.key IN (
    'system.appName',
    'system.appLogo',
    'portal.homeBanner',
    'portal.showRank',
    'auth.userAgreement'
  );

DO $verify$
DECLARE
  expected_count bigint;
  actual_count bigint;
BEGIN
  SELECT COUNT(*)
  INTO expected_count
  FROM public.sys_tenant AS tenant
  CROSS JOIN public.sys_config AS config
  WHERE tenant.id <> '00000000-0000-0000-0000-000000000001'::uuid
    AND config.key IN (
      'system.appName',
      'system.appLogo',
      'portal.homeBanner',
      'portal.showRank',
      'auth.userAgreement'
    );

  SELECT COUNT(*)
  INTO actual_count
  FROM public.sys_tenant_config_override;

  IF actual_count <> expected_count THEN
    RAISE EXCEPTION
      'tenant config backfill mismatch: expected %, got %',
      expected_count,
      actual_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sys_tenant_config_override
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  ) THEN
    RAISE EXCEPTION 'default tenant must not contain config overrides';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sys_tenant_config_override AS override
    JOIN public.sys_config AS config ON config.key = override.key
    WHERE override.value IS DISTINCT FROM config.value
  ) THEN
    RAISE EXCEPTION 'tenant config backfill values do not match current global values';
  END IF;
END
$verify$;

INSERT INTO public.typeorm_migrations ("timestamp", "name")
VALUES (1784995200000, 'AddTenantConfigOverrides1784995200000');

COMMIT;

SELECT
  COUNT(*) AS override_rows,
  COUNT(DISTINCT tenant_id) AS overridden_tenants,
  COUNT(DISTINCT key) AS overridden_keys
FROM public.sys_tenant_config_override;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sys_tenant_config_override'
ORDER BY ordinal_position;

SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'sys_tenant_config_override'
ORDER BY constraint_name;

SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'sys_tenant_config_override'
  AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
ORDER BY grantee, privilege_type;
