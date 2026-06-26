import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TokenPair } from '@app/contracts';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.usecase';
import { Public } from '../auth/public.decorator';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

/** 路由：使用刷新令牌换取新的令牌对 */
@Controller('auth')
export class AuthRefreshController {
  constructor(private readonly useCase: RefreshTokenUseCase) {}

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.useCase.execute(dto.refreshToken);
  }
}
