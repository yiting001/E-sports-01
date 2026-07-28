import {
  MigrationBaselineAuditDataSource,
  MigrationBaselineAuditQueryRunner,
  runMigrationBaselineAudit,
} from './migration-baseline-audit';
import { createMigrationCommandDataSource } from './migration-data-source';
import { assertTrustedMigrationHistory, type MigrationHistoryRecord } from './migration-history';
import { acquireMigrationLock, releaseMigrationLock } from './migration-lock';
import { SERVER_MIGRATION_DEFINITIONS } from './migration-registry';

const MIGRATION_HISTORY_TABLE = 'typeorm_migrations';
const MIGRATION_TRANSACTION_MODE = 'all' as const;

export const SERVER_COMMAND_USAGE = [
  'Usage:',
  '  node main.js [start]',
  '  node main.js migration:audit',
  '  node main.js migration:show',
  '  node main.js migration:run',
  '  node main.js --help',
].join('\n');

export type ServerCommand =
  | 'start'
  | 'migration:audit'
  | 'migration:show'
  | 'migration:run'
  | 'help';
export type MigrationCommand = Extract<ServerCommand, `migration:${string}`>;

export interface MigrationResult {
  name: string;
}

export type MigrationCommandQueryRunner = MigrationBaselineAuditQueryRunner;

export interface MigrationCommandDataSource extends MigrationBaselineAuditDataSource {
  isInitialized: boolean;
  initialize(): Promise<unknown>;
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
  executePendingMigrations(
    queryRunner: MigrationCommandQueryRunner,
    transaction: 'all' | 'none' | 'each',
  ): Promise<MigrationResult[]>;
  createQueryRunner(): MigrationCommandQueryRunner;
  destroy(): Promise<void>;
}

interface MigrationQueryExecutor {
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
}

interface MigrationCommandDependencies {
  createDataSource: () => MigrationCommandDataSource;
  write: (message: string) => void;
}

const DEFAULT_DEPENDENCIES: MigrationCommandDependencies = {
  createDataSource: createMigrationCommandDataSource,
  write: (message) => process.stdout.write(message),
};

export function resolveServerCommand(args: readonly string[]): ServerCommand {
  if (args.length === 0 || (args.length === 1 && args[0] === 'start')) {
    return 'start';
  }
  if (args.length === 1 && (args[0] === 'help' || args[0] === '--help')) {
    return 'help';
  }
  if (args.length === 1 && args[0] === 'migration:audit') {
    return 'migration:audit';
  }
  if (args.length === 1 && args[0] === 'migration:show') {
    return 'migration:show';
  }
  if (args.length === 1 && args[0] === 'migration:run') {
    return 'migration:run';
  }
  throw new Error(`Unsupported server command: ${args.join(' ') || '<empty>'}`);
}

export async function runMigrationCommand(
  command: MigrationCommand,
  dependencies: MigrationCommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const dataSource = dependencies.createDataSource();
  let commandError: unknown;
  try {
    await dataSource.initialize();
    if (command === 'migration:audit') {
      await runMigrationBaselineAudit(dataSource, dependencies.write);
      return;
    }
    if (command === 'migration:show') {
      const history = await loadValidatedMigrationHistory(dataSource);
      writeMigrationStatus(history, dependencies.write);
      return;
    }
    await runPendingMigrations(dataSource, dependencies.write);
  } catch (error) {
    commandError = error;
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      try {
        await dataSource.destroy();
      } catch (destroyError) {
        if (commandError === undefined) {
          throw destroyError;
        }
      }
    }
  }
}

async function runPendingMigrations(
  dataSource: MigrationCommandDataSource,
  write: (message: string) => void,
): Promise<void> {
  const lockRunner = dataSource.createQueryRunner();
  let connected = false;
  let locked = false;
  let commandError: unknown;
  try {
    await lockRunner.connect();
    connected = true;
    await acquireMigrationLock(lockRunner);
    locked = true;

    const history = await loadValidatedMigrationHistory(lockRunner);
    const pending = SERVER_MIGRATION_DEFINITIONS.slice(history.length);
    if (pending.length === 0) {
      write('[migration] no pending migrations\n');
      return;
    }

    const executed = await dataSource.executePendingMigrations(
      lockRunner,
      MIGRATION_TRANSACTION_MODE,
    );
    const finalHistory = await loadValidatedMigrationHistory(lockRunner);
    if (finalHistory.length !== SERVER_MIGRATION_DEFINITIONS.length) {
      throw new Error(
        `Migration run finished with ${
          SERVER_MIGRATION_DEFINITIONS.length - finalHistory.length
        } pending migration(s)`,
      );
    }
    write(`[migration] executed ${executed.length} migration(s)\n`);
    for (const migration of executed) {
      write(`[migration] executed ${migration.name}\n`);
    }
  } catch (error) {
    commandError = error;
    throw error;
  } finally {
    let cleanupError: unknown;
    try {
      if (locked) {
        await releaseMigrationLock(lockRunner);
      }
    } catch (error) {
      cleanupError = error;
    }
    try {
      if (connected) {
        await lockRunner.release();
      }
    } catch (error) {
      cleanupError ??= error;
    }
    if (commandError === undefined && cleanupError !== undefined) {
      throw cleanupError;
    }
  }
}

async function loadValidatedMigrationHistory(
  executor: MigrationQueryExecutor,
): Promise<MigrationHistoryRecord[]> {
  const historyTableResult: unknown = await executor.query(
    `SELECT to_regclass(format('%I.%I', current_schema(), $1::text))::text AS "historyTable"`,
    [MIGRATION_HISTORY_TABLE],
  );
  const historyTable = readHistoryTableName(historyTableResult);
  if (!historyTable) {
    throw new Error(
      `${MIGRATION_HISTORY_TABLE} is missing; run migration:audit and complete the manual baseline review before show/run`,
    );
  }

  const historyResult: unknown = await executor.query(
    `SELECT "timestamp"::text AS "timestamp", "name"
     FROM "typeorm_migrations"
     ORDER BY "timestamp", "id"`,
  );
  const history = readMigrationRecords(historyResult);
  assertTrustedMigrationHistory(history);
  return history;
}

function writeMigrationStatus(
  history: readonly MigrationHistoryRecord[],
  write: (message: string) => void,
): void {
  for (const [index, migration] of SERVER_MIGRATION_DEFINITIONS.entries()) {
    write(`[${index < history.length ? 'X' : ' '}] ${migration.timestamp} ${migration.name}\n`);
  }
  const pendingCount = SERVER_MIGRATION_DEFINITIONS.length - history.length;
  write(`[migration] ${pendingCount} pending migration(s)\n`);
}

function readHistoryTableName(result: unknown): string | null {
  if (!Array.isArray(result) || !isObject(result[0])) {
    throw new Error('Cannot read migration history table status');
  }
  const historyTable = result[0].historyTable;
  if (historyTable !== null && typeof historyTable !== 'string') {
    throw new Error('Invalid migration history table status');
  }
  return historyTable;
}

function readMigrationRecords(result: unknown): MigrationHistoryRecord[] {
  if (!Array.isArray(result)) {
    throw new Error('Cannot read migration history records');
  }
  return result.map((row) => {
    if (!isObject(row) || typeof row.name !== 'string') {
      throw new Error('Invalid migration history record');
    }
    const timestamp =
      typeof row.timestamp === 'string' || typeof row.timestamp === 'number'
        ? Number(row.timestamp)
        : Number.NaN;
    if (!Number.isSafeInteger(timestamp)) {
      throw new Error(`Invalid migration history timestamp for ${row.name}`);
    }
    return { name: row.name, timestamp };
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
