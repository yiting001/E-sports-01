import { Controller, Get, Query } from '@nestjs/common';
import type { WechatOfficialAuthorizeUrlView } from '@app/contracts';
import { GetWechatAuthorizeUrlUseCase } from '../../application/use-cases/get-wechat-authorize-url.usecase';
import { WechatAuthorizeUrlQueryDto } from '../dto/wechat-authorize-url.query.dto';

/** 路由：获取公众号网页授权跳转地址（GET /notify/wechat/authorize-url），登录即可 */
@Controller('notify/wechat')
export class WechatAuthorizeUrlController {
  constructor(private readonly useCase: GetWechatAuthorizeUrlUseCase) {}

  @Get('authorize-url')
  authorizeUrl(
    @Query() query: WechatAuthorizeUrlQueryDto,
  ): Promise<WechatOfficialAuthorizeUrlView> {
    return this.useCase.execute(query.redirectUri);
  }
}
