import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 清理历史 IM 消息、会话标题与引用快照中由手机号派生的登录用户名。 */
export class RedactImPhoneSystemMessages1784736300000 implements MigrationInterface {
  name = 'RedactImPhoneSystemMessages1784736300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH historical_message AS (
        SELECT
          message."id",
          (
            SELECT CASE
              WHEN btrim(service_order."booster_name") <> ''
                AND btrim(service_order."booster_name")
                  !~* '(sms_)?1[3-9][0-9]{9}(_[0-9a-f]{4})?'
                THEN btrim(service_order."booster_name")
              WHEN rbac_user."id" IS NOT NULL
                THEN CASE
                  WHEN btrim(rbac_user."nickname") <> ''
                    AND btrim(rbac_user."nickname")
                      !~* '(sms_)?1[3-9][0-9]{9}(_[0-9a-f]{4})?'
                    THEN btrim(rbac_user."nickname")
                  ELSE '用户' || upper(right(replace(rbac_user."id"::text, '-', ''), 6))
                END
              ELSE NULL
            END
            FROM "service_order" AS service_order
            LEFT JOIN "rbac_user" AS rbac_user
              ON rbac_user."tenant_id" = service_order."tenant_id"
              AND rbac_user."id"::text = service_order."booster_id"
            WHERE service_order."tenant_id" = message."tenant_id"
              AND service_order."conversation_id" = message."conversationId"
            ORDER BY
              CASE
                WHEN btrim(service_order."booster_name") <> ''
                  AND btrim(service_order."booster_name")
                    !~* '(sms_)?1[3-9][0-9]{9}(_[0-9a-f]{4})?'
                  THEN 0
                WHEN rbac_user."id" IS NOT NULL THEN 1
                ELSE 2
              END,
              service_order."id"
            LIMIT 1
          ) AS "booster_name"
        FROM "sys_chat_message" AS message
        WHERE message."senderId" = 'system'
          AND message."type" = 'system'
          AND (
            message."content"
              ~ '^打手 sms_1[3-9][0-9]{9}(_[0-9a-f]{4})? 已接单，加入群聊为您服务$'
            OR message."content" IN (
              '打手已接单，加入群聊为您服务',
              '打手 成员 已接单，加入群聊为您服务'
            )
          )
      ),
      target_message AS (
        SELECT
          historical_message."id",
          CASE
            WHEN historical_message."booster_name" IS NOT NULL
              THEN '打手 ' ||
                replace(
                  replace(
                    replace(
                      replace(
                        replace(historical_message."booster_name", '&', '&amp;'),
                        '<',
                        '&lt;'
                      ),
                      '>',
                      '&gt;'
                    ),
                    '"',
                    '&quot;'
                  ),
                  '''',
                  '&#39;'
                ) ||
                ' 已接单，加入群聊为您服务'
            ELSE '打手已接单，加入群聊为您服务'
          END AS "content"
        FROM historical_message
      )
      UPDATE "sys_chat_message" AS message
      SET
        "content" = target_message."content",
        "updated_at" = now(),
        "version" = message."version" + 1
      FROM target_message
      WHERE target_message."id" = message."id"
        AND message."content" IS DISTINCT FROM target_message."content"
    `);
    await queryRunner.query(`
      UPDATE "sys_chat_message"
      SET
        "content" = regexp_replace(
          "content",
          '\\msms_1[3-9][0-9]{9}(_[0-9a-f]{4})?\\M',
          '成员',
          'g'
        ),
        "updated_at" = now(),
        "version" = "version" + 1
      WHERE "content" ~ '\\msms_1[3-9][0-9]{9}(_[0-9a-f]{4})?\\M'
    `);
    await queryRunner.query(`
      UPDATE "sys_conversation"
      SET
        "title" = regexp_replace(
          "title",
          '\\msms_1[3-9][0-9]{9}(_[0-9a-f]{4})?\\M',
          '成员',
          'g'
        ),
        "updated_at" = now(),
        "version" = "version" + 1
      WHERE "title" ~ '\\msms_1[3-9][0-9]{9}(_[0-9a-f]{4})?\\M'
    `);
    await queryRunner.query(`
      WITH historical_reply AS (
        SELECT
          message."id",
          coalesce(
            (
              SELECT CASE
                WHEN btrim(rbac_user."nickname") <> ''
                  AND btrim(rbac_user."nickname")
                    !~* '(sms_)?1[3-9][0-9]{9}(_[0-9a-f]{4})?'
                  THEN btrim(rbac_user."nickname")
                ELSE '用户' || upper(right(replace(rbac_user."id"::text, '-', ''), 6))
              END
              FROM "rbac_user" AS rbac_user
              WHERE rbac_user."tenant_id" = message."tenant_id"
                AND rbac_user."id"::text = message."reply_to"->>'senderId'
              LIMIT 1
            ),
            '成员'
          ) AS "sender_name"
        FROM "sys_chat_message" AS message
        WHERE message."reply_to" IS NOT NULL
          AND coalesce(message."reply_to"->>'senderName', '')
            ~ '^sms_1[3-9][0-9]{9}(_[0-9a-f]{4})?$'
      )
      UPDATE "sys_chat_message" AS message
      SET
        "reply_to" = jsonb_set(
          message."reply_to",
          '{senderName}',
          to_jsonb(historical_reply."sender_name"),
          false
        ),
        "updated_at" = now(),
        "version" = message."version" + 1
      FROM historical_reply
      WHERE historical_reply."id" = message."id"
    `);
  }

  down(_queryRunner: QueryRunner): Promise<void> {
    // 隐私脱敏不可逆；回滚不得恢复已移除的手机号登录用户名。
    return Promise.resolve();
  }
}
