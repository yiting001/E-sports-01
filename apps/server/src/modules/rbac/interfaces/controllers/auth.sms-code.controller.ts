import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SendSmsCodeResult } from '@app/contracts';
import { SendLoginSmsCodeUseCase } from '../../application/use-cases/send-login-sms-code.usecase';
import { Public } from '../auth/public.decorator';
import { SendSmsCodeDto } from '../dto/send-sms-code.dto';

/** 路由：发送登录短信验证码 */
@Controller('auth/sms')
export class AuthSmsCodeController {
  constructor(private readonly useCase: SendLoginSmsCodeUseCase) {}

  @Post('code')
  @Public()
  @HttpCode(HttpStatus.OK)
  send(@Body() dto: SendSmsCodeDto): Promise<SendSmsCodeResult> {
    return this.useCase.execute(dto.phone);
  }
}
