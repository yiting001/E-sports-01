/**
 * 引导级环境配置。
 *
 * 设计约束：这里只放“连接信息 + 部署密钥”——数据库、Redis、JWT 密钥、端口。
 * 一切业务可调参数都交给【配置中心】(modules/config) 管理并入库，
 * 因此本文件刻意保持精简，是全平台唯一允许读取 process.env 的地方。
 */
export interface EnvConfig {
  nodeEnv: string;
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    synchronize: boolean;
  };
  redis: {
    host: string;
    port: number;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
  };
  /** 首次启动播种的超级管理员账号（仅在库中无此用户时创建） */
  seed: {
    adminUsername: string;
    adminPassword: string;
  };
}

function required(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`缺少必需的环境变量: ${key}`);
  }
  return value;
}

function toNumber(value: string, key: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`环境变量 ${key} 不是合法数字: ${value}`);
  }
  return parsed;
}

/** 解析并校验环境变量，缺失即快速失败 */
export function loadEnvConfig(): EnvConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: toNumber(process.env.PORT ?? '3000', 'PORT'),
    database: {
      host: required('DB_HOST'),
      port: toNumber(required('DB_PORT'), 'DB_PORT'),
      user: required('DB_USER'),
      password: required('DB_PASSWORD'),
      name: required('DB_NAME'),
      synchronize: (process.env.DB_SYNCHRONIZE ?? 'false') === 'true',
    },
    redis: {
      host: required('REDIS_HOST'),
      port: toNumber(required('REDIS_PORT'), 'REDIS_PORT'),
    },
    jwt: {
      accessSecret: required('JWT_SECRET'),
      refreshSecret: required('JWT_REFRESH_SECRET'),
    },
    seed: {
      adminUsername: process.env.SEED_ADMIN_USERNAME ?? 'admin',
      adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'admin123456',
    },
  };
}

/** 注入令牌：env 配置在容器中以此 token 提供 */
export const ENV_CONFIG = Symbol('ENV_CONFIG');
