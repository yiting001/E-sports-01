import { Injectable } from '@nestjs/common';
import { loadEnvConfig, type NodeEnvironment } from '../../../bootstrap/env.config';
import type { SmsRuntimePolicy } from '../domain/sms-runtime-policy.interface';

/** 从引导级 NODE_ENV 提供 SMS 安全门禁；业务应用层不直接访问 process.env。 */
@Injectable()
export class EnvSmsRuntimePolicy implements SmsRuntimePolicy {
  private readonly environment: NodeEnvironment = loadEnvConfig().nodeEnv;

  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  isProduction(): boolean {
    return this.environment === 'production';
  }
}
