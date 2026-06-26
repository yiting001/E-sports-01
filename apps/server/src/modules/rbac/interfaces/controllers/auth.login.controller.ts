import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TokenPair } from '@app/contracts';
import { LoginUseCase } from '../../application/use-cases/login.usecase';
import { Public } from '../auth/public.decorator';
import { LoginDto } from '../dto/login.dto';

/** 路由：用户登录，返回令牌对 */
@Controller('auth')
export class AuthLoginController {
  constructor(private readonly useCase: LoginUseCase) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.useCase.execute(dto);
  }
}
