import { Controller, Get } from '@nestjs/common';
import { AgreementView } from '@app/contracts';
import { TenantPublic } from '../../rbac/interfaces/auth/tenant-public.decorator';
import { GetAgreementUseCase } from '../application/use-cases/get-agreement.usecase';

/** 路由：读取用户协议正文（富文本），登录前即可访问 */
@Controller('config')
export class GetAgreementController {
  constructor(private readonly useCase: GetAgreementUseCase) {}

  @Get('agreement')
  @TenantPublic()
  agreement(): Promise<AgreementView> {
    return this.useCase.execute();
  }
}
