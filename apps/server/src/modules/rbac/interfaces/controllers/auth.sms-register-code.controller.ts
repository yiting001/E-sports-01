import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SendSmsCodeResult } from '@app/contracts';
import { SendRegisterSmsCodeUseCase } from '../../application/use-cases/send-register-sms-code.usecase';
import { TenantPublic } from '../auth/tenant-public.decorator';
import { SendSmsCodeDto } from '../dto/send-sms-code.dto';

/** 路由：发送注册短信验证码（仅未注册手机号） */
@Controller('auth/sms')
export class AuthSmsRegisterCodeController {
  constructor(private readonly useCase: SendRegisterSmsCodeUseCase) {}

  @Post('register-code')
  @TenantPublic()
  @HttpCode(HttpStatus.OK)
  send(@Body() dto: SendSmsCodeDto): Promise<SendSmsCodeResult> {
    return this.useCase.execute(dto.phone, dto.tenantCode);
  }
}
