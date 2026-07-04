import { Body, Controller, Post } from '@nestjs/common';
import { TokenPair } from '@app/contracts';
import { SmsRegisterUseCase } from '../../application/use-cases/sms-register.usecase';
import { Public } from '../auth/public.decorator';
import { SmsRegisterDto } from '../dto/sms-register.dto';

/** 路由：短信验证码注册，注册成功直接返回令牌对 */
@Controller('auth/sms')
export class AuthSmsRegisterController {
  constructor(private readonly useCase: SmsRegisterUseCase) {}

  @Post('register')
  @Public()
  register(@Body() dto: SmsRegisterDto): Promise<TokenPair> {
    return this.useCase.execute(dto);
  }
}
