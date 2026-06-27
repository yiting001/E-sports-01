import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TokenPair } from '@app/contracts';
import { SmsLoginUseCase } from '../../application/use-cases/sms-login.usecase';
import { Public } from '../auth/public.decorator';
import { SmsLoginDto } from '../dto/sms-login.dto';

/** 路由：短信验证码登录，返回令牌对 */
@Controller('auth/sms')
export class AuthSmsLoginController {
  constructor(private readonly useCase: SmsLoginUseCase) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: SmsLoginDto): Promise<TokenPair> {
    return this.useCase.execute(dto);
  }
}
