import { DataSource, MigrationExecutor, QueryRunner } from 'typeorm';
import { loadEnvConfig } from '../bootstrap/env.config';
import type {
  MigrationCommandDataSource,
  MigrationCommandQueryRunner,
  MigrationResult,
} from './migration-command';
import { SERVER_MIGRATIONS } from './migration-registry';

/** 创建源码命令与单文件命令共用的 migration 数据源。 */
export function createMigrationDataSource(): DataSource {
  const env = loadEnvConfig();
  return new DataSource({
    type: 'postgres',
    host: env.database.host,
    port: env.database.port,
    username: env.database.user,
    password: env.database.password,
    database: env.database.name,
    entities: [],
    migrations: SERVER_MIGRATIONS,
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'all',
    synchronize: false,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  });
}

/** 将 TypeORM DataSource 适配为命令端口，并保证 migration 与部署锁复用同一连接。 */
export function adaptMigrationCommandDataSource(
  dataSource: DataSource,
): MigrationCommandDataSource {
  return new TypeOrmMigrationCommandDataSource(dataSource);
}

export function createMigrationCommandDataSource(): MigrationCommandDataSource {
  return adaptMigrationCommandDataSource(createMigrationDataSource());
}

class TypeOrmMigrationCommandDataSource implements MigrationCommandDataSource {
  private readonly queryRunners = new WeakMap<MigrationCommandQueryRunner, QueryRunner>();

  constructor(private readonly dataSource: DataSource) {}

  get isInitialized(): boolean {
    return this.dataSource.isInitialized;
  }

  async initialize(): Promise<unknown> {
    return this.dataSource.initialize();
  }

  async query(sql: string, parameters?: unknown[]): Promise<unknown> {
    return this.dataSource.query(sql, parameters);
  }

  createQueryRunner(): MigrationCommandQueryRunner {
    const queryRunner = this.dataSource.createQueryRunner();
    this.queryRunners.set(queryRunner, queryRunner);
    return queryRunner;
  }

  async executePendingMigrations(
    queryRunner: MigrationCommandQueryRunner,
    transaction: 'all' | 'none' | 'each',
  ): Promise<MigrationResult[]> {
    const typeOrmQueryRunner = this.queryRunners.get(queryRunner);
    if (!typeOrmQueryRunner) {
      throw new Error('Migration QueryRunner was not created by this DataSource');
    }
    const executor = new MigrationExecutor(this.dataSource, typeOrmQueryRunner);
    executor.transaction = transaction;
    return executor.executePendingMigrations();
  }

  async destroy(): Promise<void> {
    await this.dataSource.destroy();
  }
}
