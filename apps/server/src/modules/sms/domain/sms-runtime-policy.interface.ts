/** SMS 对运行环境的最小只读依赖，避免应用层直接读取进程环境变量。 */
export interface SmsRuntimePolicy {
  isDevelopment(): boolean;
  isProduction(): boolean;
}

export const SMS_RUNTIME_POLICY = Symbol('SMS_RUNTIME_POLICY');
