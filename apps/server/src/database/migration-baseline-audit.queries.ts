export const CONTEXT_QUERY = `
  SELECT
    current_database() AS "database",
    current_schema() AS "schema",
    current_user AS "user",
    current_setting('server_version_num') AS "serverVersion",
    current_setting('transaction_read_only') AS "transactionReadOnly",
    to_regclass(format('%I.%I', current_schema(), 'typeorm_migrations')) IS NOT NULL
      AS "historyExists"
`;

export const HISTORY_QUERY = `
  SELECT "timestamp"::text AS "timestamp", "name"
  FROM "typeorm_migrations"
  ORDER BY "timestamp", "id"
`;

export const STRUCTURAL_ARTIFACT_QUERY = `
  WITH artifact_status(migration_timestamp, migration_name, artifact, present) AS (
    VALUES
      (1784246400000::bigint, 'AddBoosterOnboardingFields1784246400000',
        'booster onboarding columns',
        (SELECT COUNT(*) = 7 FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'booster_application'
           AND column_name IN (
             'applicant_name', 'gender', 'service_regions', 'contact_type',
             'contact_value', 'material_image', 'invitation_code'
           ))),
      (1784246400000::bigint, 'AddBoosterOnboardingFields1784246400000',
        'booster onboarding constraints',
        (SELECT COUNT(*) = 3 FROM information_schema.table_constraints
         WHERE table_schema = current_schema() AND table_name = 'booster_application'
           AND constraint_name IN (
             'CHK_booster_application_gender',
             'CHK_booster_application_contact_type',
             'CHK_booster_application_service_regions_array'
           ))),
      (1784332800000::bigint, 'AddBoosterDirectoryOrderSelection1784332800000',
        'booster voice and order selection columns',
        (SELECT COUNT(*) = 7 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND (
             (table_name = 'booster_application' AND column_name = 'voice_url')
             OR (table_name = 'service_order' AND column_name IN (
               'game_account_id', 'game_text_id', 'service_region',
               'booster_selection_mode', 'requested_booster_id', 'requested_booster_name'
             ))
           ))),
      (1784332800000::bigint, 'AddBoosterDirectoryOrderSelection1784332800000',
        'booster directory and requested booster indexes',
        to_regclass(format('%I.%I', current_schema(), 'IDX_booster_directory')) IS NOT NULL
          AND to_regclass(
            format('%I.%I', current_schema(), 'IDX_service_order_requested_booster')
          ) IS NOT NULL),
      (1784419200000::bigint, 'AddBoosterAvailability1784419200000',
        'booster accepting_orders column',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'booster_application'
            AND column_name = 'accepting_orders' AND is_nullable = 'NO'
        )),
      (1784641800000::bigint, 'AddFeedbackDirectPenalty1784641800000',
        'feedback direct penalty columns',
        (SELECT COUNT(*) = 6 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND (
             (table_name = 'feedback' AND column_name IN (
               'order_id', 'order_no', 'booster_user_id', 'booster_name', 'penalty_id'
             ))
             OR (table_name = 'booster_penalty' AND column_name = 'feedback_id')
           ))),
      (1784641800000::bigint, 'AddFeedbackDirectPenalty1784641800000',
        'feedback direct penalty indexes',
        to_regclass(format('%I.%I', current_schema(), 'IDX_feedback_order_id')) IS NOT NULL
          AND to_regclass(format('%I.%I', current_schema(), 'UQ_feedback_penalty_id')) IS NOT NULL
          AND to_regclass(
            format('%I.%I', current_schema(), 'UQ_booster_penalty_feedback_id')
          ) IS NOT NULL),
      (1784736000000::bigint, 'AddOrderRefundReview1784736000000',
        'service_order_refund table',
        to_regclass(format('%I.%I', current_schema(), 'service_order_refund')) IS NOT NULL),
      (1784736100000::bigint, 'AddOrderRefundChannelAttempt1784736100000',
        'refund channel columns and attempt table',
        to_regclass(
          format('%I.%I', current_schema(), 'service_order_refund_attempt')
        ) IS NOT NULL
          AND (SELECT COUNT(*) = 2 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'service_order_refund'
                 AND column_name IN ('channel_refund_no', 'attempt'))),
      (1784736200000::bigint, 'AddOrderMemberSpendLedger1784736200000',
        'service_order member_spend_recorded column',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'service_order'
            AND column_name = 'member_spend_recorded' AND is_nullable = 'NO'
        )),
      (1784736300000::bigint, 'RedactImPhoneSystemMessages1784736300000',
        'IM redaction source tables',
        to_regclass(format('%I.%I', current_schema(), 'sys_chat_message')) IS NOT NULL
          AND to_regclass(format('%I.%I', current_schema(), 'sys_conversation')) IS NOT NULL),
      (1784908800000::bigint, 'AddProductPcPrices1784908800000',
        'commerce product PC price columns',
        (SELECT COUNT(*) = 2 FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'commerce_product'
           AND column_name IN ('pc_price_fen', 'pc_origin_price_fen')
           AND is_nullable = 'NO')),
      (1784995200000::bigint, 'AddTenantConfigOverrides1784995200000',
        'tenant config override target table',
        to_regclass(
          format('%I.%I', current_schema(), 'sys_tenant_config_override')
        ) IS NOT NULL),
      (1785500000000::bigint, 'AddNoticePopup1785500000000',
        'notice popup column and index',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'notice'
            AND column_name = 'popup' AND is_nullable = 'NO'
        )
          AND to_regclass(format('%I.%I', current_schema(), 'IDX_notice_popup')) IS NOT NULL),
      (1785600000000::bigint, 'AddConversationMemberTag1785600000000',
        'conversation member tag column',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'sys_conversation_member'
            AND column_name = 'tag' AND data_type = 'character varying'
            AND character_maximum_length = 16 AND is_nullable = 'NO'
            AND column_default IS NOT NULL
        )),
      (1785700000000::bigint, 'AddWithdrawalIdCard1785700000000',
        'withdrawal ID card column',
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'wallet_withdrawal_order'
            AND column_name = 'idCardNo' AND data_type = 'character varying'
            AND character_maximum_length = 18 AND is_nullable = 'YES'
        ))
  )
  SELECT
    migration_timestamp::text AS "migrationTimestamp",
    migration_name AS "migrationName",
    bool_and(present) AS "allPresent",
    string_agg(artifact, '; ' ORDER BY artifact) FILTER (WHERE NOT present)
      AS "missingArtifacts"
  FROM artifact_status
  GROUP BY migration_timestamp, migration_name
  ORDER BY migration_timestamp
`;

export const DATA_AUDIT_CAPABILITY_QUERY = `
  SELECT
    to_regclass(format('%I.%I', current_schema(), 'service_order_refund')) IS NOT NULL
      AND to_regclass(
        format('%I.%I', current_schema(), 'service_order_refund_attempt')
      ) IS NOT NULL AS "refund",
    to_regclass(format('%I.%I', current_schema(), 'service_order')) IS NOT NULL
      AND to_regclass(format('%I.%I', current_schema(), 'member_profile')) IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'service_order'
          AND column_name = 'member_spend_recorded'
      ) AS "memberSpend",
    to_regclass(format('%I.%I', current_schema(), 'sys_chat_message')) IS NOT NULL
      AND to_regclass(format('%I.%I', current_schema(), 'sys_conversation')) IS NOT NULL
      AS "imRedaction"
`;

export const REFUND_DATA_QUERY = `
  SELECT COUNT(*)::text AS "issueCount"
  FROM "service_order_refund" AS refund
  WHERE refund."status" IN ('processing', 'succeeded', 'failed')
    AND refund."payment_method" <> 'balance'
    AND refund."amount_fen" > 0
    AND NOT EXISTS (
      SELECT 1
      FROM "service_order_refund_attempt" AS attempt
      WHERE attempt."refund_id" = refund."id" AND attempt."attempt" = 1
    )
`;

export const MEMBER_SPEND_DATA_QUERY = `
  WITH expected AS (
    SELECT "tenant_id", "user_id", SUM("amount_fen") AS spend_fen
    FROM "service_order"
    WHERE "status" IN (
      'pending_service', 'dispatching', 'serving', 'completed', 'refund_reviewing'
    )
    GROUP BY "tenant_id", "user_id"
  )
  SELECT (
    COUNT(*) FILTER (
      WHERE COALESCE(profile."spend_fen", 0) <> COALESCE(expected.spend_fen, 0)
    ) + (
      SELECT COUNT(*) FROM "service_order"
      WHERE "status" IN (
        'pending_service', 'dispatching', 'serving', 'completed', 'refund_reviewing'
      )
        AND "amount_fen" > 0
        AND NOT "member_spend_recorded"
    )
  )::text AS "issueCount"
  FROM expected
  FULL JOIN "member_profile" AS profile
    ON profile."tenant_id" = expected."tenant_id"
   AND profile."user_id" = expected."user_id"
`;

export const IM_REDACTION_DATA_QUERY = String.raw`
  SELECT (
    (SELECT COUNT(*) FROM "sys_chat_message"
     WHERE "content" ~ '\msms_1[3-9][0-9]{9}(_[0-9a-f]{4})?\M')
    +
    (SELECT COUNT(*) FROM "sys_conversation"
     WHERE "title" ~ '\msms_1[3-9][0-9]{9}(_[0-9a-f]{4})?\M')
    +
    (SELECT COUNT(*) FROM "sys_chat_message"
     WHERE COALESCE("reply_to"->>'senderName', '')
       ~ '^sms_1[3-9][0-9]{9}(_[0-9a-f]{4})?$')
  )::text AS "issueCount"
`;
