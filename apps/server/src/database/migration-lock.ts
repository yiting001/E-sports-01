import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

const MIGRATION_LOCK_NAME = 'e-sports-01:typeorm-migrations';
const MIGRATION_LOCK_WAIT_TIMEOUT_MS = 30_000;
const MIGRATION_LOCK_POLL_INTERVAL_MS = 100;

export interface MigrationLockExecutor {
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
}

interface MigrationLockOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

/** 获取部署级 session migration 锁；有界轮询不会覆盖 DBA 的会话超时配置。 */
export async function acquireMigrationLock(executor: MigrationLockExecutor): Promise<void> {
  await acquireBoundedMigrationLock(executor, MIGRATION_LOCK_NAME, false);
}

/** 获取 migration 自身的事务级互斥锁，事务结束后由 PostgreSQL 自动释放。 */
export async function acquireTransactionMigrationLock(
  executor: MigrationLockExecutor,
  lockName: string,
  options: MigrationLockOptions = {},
): Promise<void> {
  await acquireBoundedMigrationLock(executor, lockName, true, options);
}

class MigrationLockTimeoutError extends Error {
  constructor(timeoutSeconds: number) {
    super(`Timed out after ${timeoutSeconds} seconds waiting for the migration lock`);
    this.name = 'MigrationLockTimeoutError';
  }
}

export async function releaseMigrationLock(executor: MigrationLockExecutor): Promise<void> {
  const result = await executor.query('SELECT pg_advisory_unlock(hashtext($1)) AS "released"', [
    MIGRATION_LOCK_NAME,
  ]);
  if (!readBooleanResult(result, 'released')) {
    throw new Error('PostgreSQL migration lock was not held by this session');
  }
}

async function acquireBoundedMigrationLock(
  executor: MigrationLockExecutor,
  lockName: string,
  transactionScoped: boolean,
  options: MigrationLockOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? MIGRATION_LOCK_WAIT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? MIGRATION_LOCK_POLL_INTERVAL_MS;
  const deadline = performance.now() + timeoutMs;
  while (true) {
    const result = await executor.query(
      transactionScoped
        ? 'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS "acquired"'
        : 'SELECT pg_try_advisory_lock(hashtext($1)) AS "acquired"',
      [lockName],
    );
    if (readBooleanResult(result, 'acquired')) {
      return;
    }

    const remainingMs = deadline - performance.now();
    if (remainingMs <= 0) {
      throw new MigrationLockTimeoutError(timeoutMs / 1_000);
    }
    await delay(Math.min(pollIntervalMs, remainingMs));
  }
}

function readBooleanResult(result: unknown, key: 'acquired' | 'released'): boolean {
  if (!Array.isArray(result) || !isObject(result[0])) {
    throw new Error(`Invalid PostgreSQL advisory lock ${key} result`);
  }
  const value = key === 'acquired' ? result[0].acquired : result[0].released;
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid PostgreSQL advisory lock ${key} result`);
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
