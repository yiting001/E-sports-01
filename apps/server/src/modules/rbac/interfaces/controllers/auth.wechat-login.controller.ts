import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TokenPair } from '@app/contracts';
import { WechatLoginUseCase } from '../../application/use-cases/wechat-login.usecase';
import { TenantPublic } from '../auth/tenant-public.decorator';
import { WechatLoginDto } from '../dto/wechat-login.dto';

/** 路由：微信公众号网页授权登录（POST /auth/wechat/login），首登自动注册普通用户 */
@Controller('auth/wechat')
export class AuthWechatLoginController {
  constructor(private readonly useCase: WechatLoginUseCase) {}

  @Post('login')
  @TenantPublic()
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: WechatLoginDto): Promise<TokenPair> {
    return this.useCase.execute(dto);
  }
}
