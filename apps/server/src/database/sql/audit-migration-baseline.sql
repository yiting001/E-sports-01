\set ON_ERROR_STOP on
\pset pager off

BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;

-- 只读核验：本脚本不创建表、不写入 migration history、不修改业务数据。
SELECT
  current_database() AS database_name,
  current_user AS database_user,
  current_schema() AS current_schema,
  now() AS audited_at;

SELECT CASE
  WHEN to_regclass('public.typeorm_migrations') IS NULL THEN 'false'
  ELSE 'true'
END AS history_table_exists \gset

\if :history_table_exists
SELECT "id", "timestamp", "name"
FROM public.typeorm_migrations
ORDER BY "timestamp", "id";
\else
\echo 'MIGRATION_HISTORY_MISSING: public.typeorm_migrations does not exist'
\endif

WITH artifact_status(migration_timestamp, migration_name, artifact, present) AS (
  VALUES
    (1784246400000::bigint, 'AddBoosterOnboardingFields1784246400000',
      'booster_application onboarding columns',
      (SELECT COUNT(*) = 7 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'booster_application'
         AND column_name IN (
           'applicant_name', 'gender', 'service_regions', 'contact_type',
           'contact_value', 'material_image', 'invitation_code'
         ))),
    (1784246400000::bigint, 'AddBoosterOnboardingFields1784246400000',
      'booster_application onboarding constraints',
      (SELECT COUNT(*) = 3 FROM information_schema.table_constraints
       WHERE table_schema = 'public' AND table_name = 'booster_application'
         AND constraint_name IN (
           'CHK_booster_application_gender',
           'CHK_booster_application_contact_type',
           'CHK_booster_application_service_regions_array'
         ))),
    (1784332800000::bigint, 'AddBoosterDirectoryOrderSelection1784332800000',
      'booster voice and order selection columns',
      (SELECT COUNT(*) = 7 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (
           (table_name = 'booster_application' AND column_name = 'voice_url')
           OR (table_name = 'service_order' AND column_name IN (
             'game_account_id', 'game_text_id', 'service_region',
             'booster_selection_mode', 'requested_booster_id', 'requested_booster_name'
           ))
         ))),
    (1784332800000::bigint, 'AddBoosterDirectoryOrderSelection1784332800000',
      'booster directory and requested booster indexes',
      to_regclass('public."IDX_booster_directory"') IS NOT NULL
        AND to_regclass('public."IDX_service_order_requested_booster"') IS NOT NULL),
    (1784419200000::bigint, 'AddBoosterAvailability1784419200000',
      'booster_application.accepting_orders',
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'booster_application'
          AND column_name = 'accepting_orders' AND is_nullable = 'NO'
      )),
    (1784641800000::bigint, 'AddFeedbackDirectPenalty1784641800000',
      'feedback direct penalty columns',
      (SELECT COUNT(*) = 6 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (
           (table_name = 'feedback' AND column_name IN (
             'order_id', 'order_no', 'booster_user_id', 'booster_name', 'penalty_id'
           ))
           OR (table_name = 'booster_penalty' AND column_name = 'feedback_id')
         ))),
    (1784641800000::bigint, 'AddFeedbackDirectPenalty1784641800000',
      'feedback direct penalty indexes',
      to_regclass('public."IDX_feedback_order_id"') IS NOT NULL
        AND to_regclass('public."UQ_feedback_penalty_id"') IS NOT NULL
        AND to_regclass('public."UQ_booster_penalty_feedback_id"') IS NOT NULL),
    (1784736000000::bigint, 'AddOrderRefundReview1784736000000',
      'service_order_refund table',
      to_regclass('public.service_order_refund') IS NOT NULL),
    (1784736100000::bigint, 'AddOrderRefundChannelAttempt1784736100000',
      'refund channel columns and attempt table',
      to_regclass('public.service_order_refund_attempt') IS NOT NULL
        AND (SELECT COUNT(*) = 2 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'service_order_refund'
               AND column_name IN ('channel_refund_no', 'attempt'))),
    (1784736200000::bigint, 'AddOrderMemberSpendLedger1784736200000',
      'service_order.member_spend_recorded',
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'service_order'
          AND column_name = 'member_spend_recorded' AND is_nullable = 'NO'
      )),
    (1784736300000::bigint, 'RedactImPhoneSystemMessages1784736300000',
      'redaction source tables (data migration has no schema artifact)',
      to_regclass('public.sys_chat_message') IS NOT NULL
        AND to_regclass('public.sys_conversation') IS NOT NULL),
    (1784908800000::bigint, 'AddProductPcPrices1784908800000',
      'commerce_product PC price columns',
      (SELECT COUNT(*) = 2 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'commerce_product'
         AND column_name IN ('pc_price_fen', 'pc_origin_price_fen')
         AND is_nullable = 'NO'))
), migration_status AS (
  SELECT
    migration_timestamp,
    migration_name,
    bool_and(present) AS all_structural_artifacts_present,
    string_agg(artifact, '; ' ORDER BY artifact) FILTER (WHERE NOT present)
      AS missing_artifacts
  FROM artifact_status
  GROUP BY migration_timestamp, migration_name
)
SELECT *
FROM migration_status
ORDER BY migration_timestamp;

SELECT CASE
  WHEN to_regclass('public.service_order_refund') IS NOT NULL
    AND to_regclass('public.service_order_refund_attempt') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'service_order_refund'
        AND column_name = 'attempt'
    )
  THEN 'true' ELSE 'false'
END AS refund_attempt_auditable \gset

\if :refund_attempt_auditable
SELECT COUNT(*) AS missing_historical_refund_attempts
FROM public.service_order_refund AS refund
WHERE refund."status" IN ('processing', 'succeeded', 'failed')
  AND refund."payment_method" <> 'balance'
  AND refund."amount_fen" > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.service_order_refund_attempt AS attempt
    WHERE attempt."refund_id" = refund."id"
      AND attempt."attempt" = 1
  );
\else
\echo 'REFUND_ATTEMPT_AUDIT_SKIPPED: required table or column is missing'
\endif

SELECT CASE
  WHEN to_regclass('public.service_order') IS NOT NULL
    AND to_regclass('public.member_profile') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'service_order'
        AND column_name = 'member_spend_recorded'
    )
  THEN 'true' ELSE 'false'
END AS member_spend_auditable \gset

\if :member_spend_auditable
WITH expected AS (
  SELECT
    "tenant_id",
    "user_id",
    SUM("amount_fen") AS spend_fen
  FROM public.service_order
  WHERE "status" IN (
    'pending_service', 'dispatching', 'serving', 'completed', 'refund_reviewing'
  )
  GROUP BY "tenant_id", "user_id"
)
SELECT
  COUNT(*) FILTER (
    WHERE COALESCE(profile."spend_fen", 0) <> COALESCE(expected.spend_fen, 0)
  ) AS member_spend_mismatch_profiles,
  (
    SELECT COUNT(*)
    FROM public.service_order
    WHERE "status" IN (
      'pending_service', 'dispatching', 'serving', 'completed', 'refund_reviewing'
    )
      AND "amount_fen" > 0
      AND NOT "member_spend_recorded"
  ) AS paid_orders_not_recorded
FROM expected
FULL JOIN public.member_profile AS profile
  ON profile."tenant_id" = expected."tenant_id"
 AND profile."user_id" = expected."user_id";
\else
\echo 'MEMBER_SPEND_AUDIT_SKIPPED: required table or column is missing'
\endif

SELECT CASE
  WHEN to_regclass('public.sys_chat_message') IS NOT NULL
    AND to_regclass('public.sys_conversation') IS NOT NULL
  THEN 'true' ELSE 'false'
END AS im_redaction_auditable \gset

\if :im_redaction_auditable
SELECT
  (SELECT COUNT(*) FROM public.sys_chat_message
   WHERE "content" ~ '\msms_1[3-9][0-9]{9}(_[0-9a-f]{4})?\M')
    AS message_phone_login_residue,
  (SELECT COUNT(*) FROM public.sys_conversation
   WHERE "title" ~ '\msms_1[3-9][0-9]{9}(_[0-9a-f]{4})?\M')
    AS conversation_phone_login_residue,
  (SELECT COUNT(*) FROM public.sys_chat_message
   WHERE COALESCE("reply_to"->>'senderName', '')
     ~ '^sms_1[3-9][0-9]{9}(_[0-9a-f]{4})?$')
    AS reply_snapshot_phone_login_residue;
\else
\echo 'IM_REDACTION_AUDIT_SKIPPED: required tables are missing'
\endif

ROLLBACK;

\echo 'READ_ONLY_AUDIT_COMPLETE: do not insert migration history from this output alone'
