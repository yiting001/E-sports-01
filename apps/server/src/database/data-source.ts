import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { loadEnvConfig } from '../bootstrap/env.config';

const env = loadEnvConfig();

/** TypeORM CLI 数据源；应用运行仍由 DatabaseModule 负责连接装配。 */
export default new DataSource({
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.user,
  password: env.database.password,
  database: env.database.name,
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  uuidExtension: 'pgcrypto',
  installExtensions: false,
});
