import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SmsLoginResult } from '@app/contracts';
import { SmsLoginUseCase } from '../../application/use-cases/sms-login.usecase';
import { TenantPublic } from '../auth/tenant-public.decorator';
import { SmsLoginDto } from '../dto/sms-login.dto';

/** 路由：短信验证码登录（登录注册合一），返回令牌对与首登标记 */
@Controller('auth/sms')
export class AuthSmsLoginController {
  constructor(private readonly useCase: SmsLoginUseCase) {}

  @Post('login')
  @TenantPublic()
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: SmsLoginDto): Promise<SmsLoginResult> {
    return this.useCase.execute(dto);
  }
}
