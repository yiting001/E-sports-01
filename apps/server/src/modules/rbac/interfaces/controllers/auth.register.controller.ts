import { Body, Controller, Post } from '@nestjs/common';
import { TokenPair } from '@app/contracts';
import { RegisterUseCase } from '../../application/use-cases/register.usecase';
import { Public } from '../auth/public.decorator';
import { RegisterDto } from '../dto/register.dto';

/** 路由：用户注册，注册成功直接返回令牌对 */
@Controller('auth')
export class AuthRegisterController {
  constructor(private readonly useCase: RegisterUseCase) {}

  @Post('register')
  @Public()
  register(@Body() dto: RegisterDto): Promise<TokenPair> {
    return this.useCase.execute(dto);
  }
}
