import 'reflect-metadata';
import { createMigrationDataSource } from './migration-data-source';

/** TypeORM CLI 默认导出；应用与单文件命令使用同一工厂和静态清单。 */
export default createMigrationDataSource();
