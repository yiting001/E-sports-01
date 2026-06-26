import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadEnvConfig } from '../../bootstrap/env.config';

/**
 * 数据库基础设施模块。
 * 唯一从环境变量读取“连接信息”的数据访问入口；
 * 表结构由各模块通过 TypeOrmModule.forFeature 注册的实体自动加载。
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const env = loadEnvConfig();
        return {
          type: 'postgres',
          host: env.database.host,
          port: env.database.port,
          username: env.database.user,
          password: env.database.password,
          database: env.database.name,
          autoLoadEntities: true,
          synchronize: env.database.synchronize,
          namingStrategy: undefined,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
