import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnvConfig } from './bootstrap/env.config';
import { AllExceptionsFilter } from './shared/http/all-exceptions.filter';
import { ResponseInterceptor } from './shared/http/response.interceptor';

/**
 * 应用入口。
 * 仅做装配：全局前缀、校验管道、统一响应/异常处理与 CORS。
 */
async function bootstrap(): Promise<void> {
  const env = loadEnvConfig();
  const app = await NestFactory.create(AppModule);

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

  await app.listen(env.port);
}

void bootstrap();
