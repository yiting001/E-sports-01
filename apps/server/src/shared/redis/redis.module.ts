import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { loadEnvConfig } from '../../bootstrap/env.config';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Redis 基础设施模块。
 * 提供单例 ioredis 客户端，供配置缓存、WebSocket 等模块复用。
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const env = loadEnvConfig();
        return new Redis({
          host: env.redis.host,
          port: env.redis.port,
          lazyConnect: false,
          maxRetriesPerRequest: 2,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor() {}

  async onApplicationShutdown(): Promise<void> {
    // 客户端在进程退出时由 ioredis 自行清理；如需优雅关闭可在此扩展
  }
}
