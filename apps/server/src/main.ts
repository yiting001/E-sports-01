import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import { CONFIG_KEYS } from '@app/contracts';
import { AppModule } from './app.module';
import { loadEnvConfig } from './bootstrap/env.config';
import { ConfigService } from './modules/config/application/config.service';
import { AllExceptionsFilter } from './shared/http/all-exceptions.filter';
import { ResponseInterceptor } from './shared/http/response.interceptor';

/**
 * 应用入口。
 * 仅做装配：全局前缀、校验管道、统一响应/异常处理、CORS 与本地文件静态目录。
 */
async function bootstrap(): Promise<void> {
  const env = loadEnvConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 保留原始请求体，供支付回调按渠道规范做签名校验
    rawBody: true,
  });

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await serveLocalUploads(app);

  await app.listen(env.port);
}

/**
 * 按配置中心暴露本地上传目录为静态资源。
 * 目录与访问路径均取自配置（upload.local.dir / upload.local.baseUrl），不写死。
 */
async function serveLocalUploads(app: NestExpressApplication): Promise<void> {
  const config = app.get(ConfigService);
  const dir = await config.getString(CONFIG_KEYS.upload.localDir, 'uploads');
  const baseUrl = await config.getString(
    CONFIG_KEYS.upload.localBaseUrl,
    'http://127.0.0.1:3000/static',
  );
  let prefix = '/static';
  try {
    prefix = new URL(baseUrl).pathname || '/static';
  } catch {
    prefix = '/static';
  }
  app.useStaticAssets(resolve(process.cwd(), dir), { prefix });
}

void bootstrap();
