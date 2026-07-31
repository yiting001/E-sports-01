import { createHash } from 'node:crypto';
import {
  CONTEXT_QUERY,
  DATA_AUDIT_CAPABILITY_QUERY,
  HISTORY_QUERY,
  IM_REDACTION_DATA_QUERY,
  MEMBER_SPEND_DATA_QUERY,
  REFUND_DATA_QUERY,
  STRUCTURAL_ARTIFACT_QUERY,
} from './migration-baseline-audit.queries';
import {
  getMigrationHistoryValidationError,
  type MigrationHistoryRecord,
} from './migration-history';
import { acquireMigrationLock, releaseMigrationLock } from './migration-lock';
import { SERVER_MIGRATION_DEFINITIONS } from './migration-registry';

type AuditCheckStatus = 'pass' | 'fail' | 'inconclusive' | 'not_applicable';

interface AuditCheck {
  migrationName: string;
  migrationTimestamp: number;
  status: AuditCheckStatus;
  detail: string;
}

export interface MigrationBaselineAuditQueryRunner {
  connect(): Promise<void>;
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
  startTransaction(isolationLevel?: 'REPEATABLE READ'): Promise<void>;
  rollbackTransaction(): Promise<void>;
  release(): Promise<void>;
}

export interface MigrationBaselineAuditDataSource {
  createQueryRunner(): MigrationBaselineAuditQueryRunner;
}

interface AuditReport {
  formatVersion: 1;
  bundleRegistryDigest: string;
  target: {
    database: string;
    schema: string;
    user: string;
    serverVersion: string;
  };
  guardrails: {
    transactionReadOnly: boolean;
    isolation: 'repeatable read';
  };
  history: {
    state: 'missing' | 'empty' | 'present' | 'invalid';
    validationError: string | null;
    records: MigrationHistoryRecord[];
  };
  checks: AuditCheck[];
  summary: {
    manualBaselineRequired: boolean;
    warning: string;
  };
}

/** 采集历史库 baseline 证据；全程只读，不创建 history，也不据现状推断已执行记录。 */
export async function runMigrationBaselineAudit(
  dataSource: MigrationBaselineAuditDataSource,
  write: (message: string) => void,
): Promise<void> {
  const runner = dataSource.createQueryRunner();
  let connected = false;
  let locked = false;
  let transactionStarted = false;
  let commandError: unknown;
  try {
    await runner.connect();
    connected = true;
    await acquireMigrationLock(runner);
    locked = true;
    await runner.startTransaction('REPEATABLE READ');
    transactionStarted = true;
    await runner.query('SET TRANSACTION READ ONLY');

    const report = await collectAuditReport(runner);
    write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    commandError = error;
    throw error;
  } finally {
    let cleanupError: unknown;
    try {
      if (transactionStarted) {
        await runner.rollbackTransaction();
      }
    } catch (error) {
      cleanupError = error;
    }
    try {
      if (locked) {
        await releaseMigrationLock(runner);
      }
    } catch (error) {
      cleanupError ??= error;
    }
    try {
      if (connected) {
        await runner.release();
      }
    } catch (error) {
      cleanupError ??= error;
    }
    if (commandError === undefined && cleanupError !== undefined) {
      throw cleanupError;
    }
  }
}

async function collectAuditReport(runner: MigrationBaselineAuditQueryRunner): Promise<AuditReport> {
  const context = readSingleRow(await runner.query(CONTEXT_QUERY), 'audit context');
  const historyExists = readBoolean(context, 'historyExists');
  const history = historyExists ? readHistory(await runner.query(HISTORY_QUERY)) : [];
  const historyValidationError =
    history.length > 0 ? getMigrationHistoryValidationError(history) : null;
  const structuralRows = readRows(
    await runner.query(STRUCTURAL_ARTIFACT_QUERY),
    'structural audit',
  );
  const capabilities = readSingleRow(
    await runner.query(DATA_AUDIT_CAPABILITY_QUERY),
    'data audit capabilities',
  );
  const checks = structuralRows.map((row) => toStructuralCheck(row, history));

  checks.push(
    await collectDataCheck(
      runner,
      readBoolean(capabilities, 'refund'),
      'AddOrderRefundChannelAttempt1784736100000',
      REFUND_DATA_QUERY,
      'historical channel refunds without attempt 1',
    ),
    await collectDataCheck(
      runner,
      readBoolean(capabilities, 'memberSpend'),
      'AddOrderMemberSpendLedger1784736200000',
      MEMBER_SPEND_DATA_QUERY,
      'member spend aggregate inconsistencies',
    ),
    await collectDataCheck(
      runner,
      readBoolean(capabilities, 'imRedaction'),
      'RedactImPhoneSystemMessages1784736300000',
      IM_REDACTION_DATA_QUERY,
      'phone-login residues after redaction',
    ),
  );

  return {
    formatVersion: 1,
    bundleRegistryDigest: createRegistryDigest(),
    target: {
      database: readString(context, 'database'),
      schema: readString(context, 'schema'),
      user: readString(context, 'user'),
      serverVersion: readString(context, 'serverVersion'),
    },
    guardrails: {
      transactionReadOnly: readString(context, 'transactionReadOnly') === 'on',
      isolation: 'repeatable read',
    },
    history: {
      state: !historyExists
        ? 'missing'
        : history.length === 0
        ? 'empty'
        : historyValidationError
        ? 'invalid'
        : 'present',
      validationError: historyValidationError,
      records: history,
    },
    checks,
    summary: {
      manualBaselineRequired:
        !historyExists || history.length === 0 || historyValidationError !== null,
      warning:
        'Audit evidence is read-only and does not authorize creating or faking migration history.',
    },
  };
}

function toStructuralCheck(
  row: Record<string, unknown>,
  history: readonly MigrationHistoryRecord[],
): AuditCheck {
  const migrationName = readString(row, 'migrationName');
  const migrationTimestamp = readSafeInteger(row, 'migrationTimestamp');
  const allPresent = readBoolean(row, 'allPresent');
  const isManagedPendingMigration =
    migrationName === 'AddTenantConfigOverrides1784995200000' ||
    migrationName === 'AddNoticePopup1785500000000' ||
    migrationName === 'AddConversationMemberTag1785600000000' ||
    migrationName === 'AddWithdrawalIdCard1785700000000' ||
    migrationName === 'AddThemeEffectSetting1785800000000';
  const recorded = history.some(
    (record) => record.name === migrationName && record.timestamp === migrationTimestamp,
  );
  if (isManagedPendingMigration && !recorded) {
    return {
      migrationName,
      migrationTimestamp,
      status: allPresent ? 'fail' : 'pass',
      detail: allPresent
        ? 'required artifacts already exist but the migration is not recorded'
        : 'required artifacts are absent and can be created by the pending migration',
    };
  }
  if (
    migrationName === 'RedactImPhoneSystemMessages1784736300000' ||
    migrationName === 'AddProductPcPrices1784908800000'
  ) {
    return {
      migrationName,
      migrationTimestamp,
      status: allPresent ? 'inconclusive' : 'fail',
      detail: allPresent
        ? 'current structure cannot prove that the historical data migration ran'
        : readNullableString(row, 'missingArtifacts') ?? 'required artifacts are missing',
    };
  }
  return {
    migrationName,
    migrationTimestamp,
    status: allPresent ? 'pass' : 'fail',
    detail: allPresent
      ? 'required structural artifacts are present'
      : readNullableString(row, 'missingArtifacts') ?? 'required artifacts are missing',
  };
}

async function collectDataCheck(
  runner: MigrationBaselineAuditQueryRunner,
  applicable: boolean,
  migrationName: string,
  query: string,
  issueDescription: string,
): Promise<AuditCheck> {
  const definition = SERVER_MIGRATION_DEFINITIONS.find((item) => item.name === migrationName);
  if (!definition) {
    throw new Error(`Missing migration definition for audit rule: ${migrationName}`);
  }
  if (!applicable) {
    return {
      migrationName,
      migrationTimestamp: definition.timestamp,
      status: 'not_applicable',
      detail: `cannot check ${issueDescription} because required relations are missing`,
    };
  }
  const row = readSingleRow(await runner.query(query), `${migrationName} data audit`);
  const issueCount = readSafeInteger(row, 'issueCount');
  return {
    migrationName,
    migrationTimestamp: definition.timestamp,
    status: issueCount === 0 ? 'pass' : 'fail',
    detail: `${issueCount} ${issueDescription}`,
  };
}

function readHistory(result: unknown): MigrationHistoryRecord[] {
  return readRows(result, 'migration history').map((row) => ({
    name: readString(row, 'name'),
    timestamp: readSafeInteger(row, 'timestamp'),
  }));
}

function createRegistryDigest(): string {
  const registry = SERVER_MIGRATION_DEFINITIONS.map(
    ({ timestamp, name }) => `${timestamp}:${name}`,
  ).join('\n');
  return createHash('sha256').update(registry).digest('hex');
}

function readRows(result: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(result) || !result.every(isObject)) {
    throw new Error(`Cannot read ${label} result`);
  }
  return result;
}

function readSingleRow(result: unknown, label: string): Record<string, unknown> {
  const rows = readRows(result, label);
  if (rows.length !== 1) {
    throw new Error(`Expected one row for ${label}`);
  }
  return rows[0];
}

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${key} in migration audit result`);
  }
  return value;
}

function readNullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value !== null && typeof value !== 'string') {
    throw new Error(`Invalid ${key} in migration audit result`);
  }
  return value;
}

function readBoolean(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${key} in migration audit result`);
  }
  return value;
}

function readSafeInteger(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  const parsed =
    typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Invalid ${key} in migration audit result`);
  }
  return parsed;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
