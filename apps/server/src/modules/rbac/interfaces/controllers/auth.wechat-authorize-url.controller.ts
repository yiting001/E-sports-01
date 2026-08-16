import { Controller, Get, Query } from '@nestjs/common';
import { WechatOfficialAuthorizeUrlView } from '@app/contracts';
import { GetWechatLoginUrlUseCase } from '../../application/use-cases/get-wechat-login-url.usecase';
import { TenantPublic } from '../auth/tenant-public.decorator';
import { WechatLoginAuthorizeUrlQueryDto } from '../dto/wechat-authorize-url.query.dto';

/** 路由：获取微信登录的公众号网页授权地址（GET /auth/wechat/authorize-url），公开 */
@Controller('auth/wechat')
export class AuthWechatAuthorizeUrlController {
  constructor(private readonly useCase: GetWechatLoginUrlUseCase) {}

  @Get('authorize-url')
  @TenantPublic()
  authorizeUrl(
    @Query() query: WechatLoginAuthorizeUrlQueryDto,
  ): Promise<WechatOfficialAuthorizeUrlView> {
    return this.useCase.execute(query.redirectUri);
  }
}
