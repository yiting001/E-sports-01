import type { MigrationInterface } from 'typeorm';
import { AddBoosterOnboardingFields1784246400000 } from './migrations/1784246400000-add-booster-onboarding-fields';
import { AddBoosterDirectoryOrderSelection1784332800000 } from './migrations/1784332800000-add-booster-directory-order-selection';
import { AddBoosterAvailability1784419200000 } from './migrations/1784419200000-add-booster-availability';
import { AddFeedbackDirectPenalty1784641800000 } from './migrations/1784641800000-add-feedback-direct-penalty';
import { AddOrderRefundReview1784736000000 } from './migrations/1784736000000-add-order-refund-review';
import { AddOrderRefundChannelAttempt1784736100000 } from './migrations/1784736100000-add-order-refund-channel-attempt';
import { AddOrderMemberSpendLedger1784736200000 } from './migrations/1784736200000-add-order-member-spend-ledger';
import { RedactImPhoneSystemMessages1784736300000 } from './migrations/1784736300000-redact-im-phone-system-messages';
import { AddProductPcPrices1784908800000 } from './migrations/1784908800000-add-product-pc-prices';
import { AddTenantConfigOverrides1784995200000 } from './migrations/1784995200000-add-tenant-config-overrides';
import { AddNoticePopup1785500000000 } from './migrations/1785500000000-add-notice-popup';
import { AddConversationMemberTag1785600000000 } from './migrations/1785600000000-add-conversation-member-tag';
import { AddWithdrawalIdCard1785700000000 } from './migrations/1785700000000-add-withdrawal-idcard';
import { AddThemeEffectSetting1785800000000 } from './migrations/1785800000000-add-theme-effect-setting';
import { AddNotifyWechatBinding1785900000000 } from './migrations/1785900000000-add-notify-wechat-binding';
import { RelaxBoosterServiceRegionsCheck1786000000000 } from './migrations/1786000000000-relax-booster-service-regions-check';
import { AddAuthWechatIdentity1786100000000 } from './migrations/1786100000000-add-auth-wechat-identity';
import { AddRbacRoleSoftDelete1786300000000 } from './migrations/1786300000000-add-rbac-role-soft-delete';
import { DropRbacRoleCodeUnique1786400000000 } from './migrations/1786400000000-drop-rbac-role-code-unique';
import { AddPaymentChannelFeeAndPayoutSnapshot1786500000000 } from './migrations/1786500000000-add-payment-channel-fee-and-payout-snapshot';

export type ServerMigrationConstructor = new () => MigrationInterface;

export interface ServerMigrationDefinition {
  name: string;
  timestamp: number;
  target: ServerMigrationConstructor;
}

/**
 * 单文件产物无法使用目录 glob，所有 migration 必须在这里显式登记。
 * 对应测试会校验该清单与 migrations 目录一一匹配且严格按时间排序。
 */
export const SERVER_MIGRATIONS: ServerMigrationConstructor[] = [
  AddBoosterOnboardingFields1784246400000,
  AddBoosterDirectoryOrderSelection1784332800000,
  AddBoosterAvailability1784419200000,
  AddFeedbackDirectPenalty1784641800000,
  AddOrderRefundReview1784736000000,
  AddOrderRefundChannelAttempt1784736100000,
  AddOrderMemberSpendLedger1784736200000,
  RedactImPhoneSystemMessages1784736300000,
  AddProductPcPrices1784908800000,
  AddTenantConfigOverrides1784995200000,
  AddNoticePopup1785500000000,
  AddConversationMemberTag1785600000000,
  AddWithdrawalIdCard1785700000000,
  AddThemeEffectSetting1785800000000,
  AddNotifyWechatBinding1785900000000,
  RelaxBoosterServiceRegionsCheck1786000000000,
  AddAuthWechatIdentity1786100000000,
  AddRbacRoleSoftDelete1786300000000,
  DropRbacRoleCodeUnique1786400000000,
  AddPaymentChannelFeeAndPayoutSnapshot1786500000000,
];

export const SERVER_MIGRATION_DEFINITIONS: ServerMigrationDefinition[] =
  SERVER_MIGRATIONS.map(toMigrationDefinition);

function toMigrationDefinition(target: ServerMigrationConstructor): ServerMigrationDefinition {
  const migration = new target();
  const name = migration.name;
  const timestampText = name ? /(\d{13})$/.exec(name)?.[1] : undefined;
  const timestamp = timestampText ? Number(timestampText) : Number.NaN;
  if (!name || !Number.isSafeInteger(timestamp)) {
    throw new Error(`Invalid server migration name: ${name ?? target.name}`);
  }
  return { name, timestamp, target };
}
