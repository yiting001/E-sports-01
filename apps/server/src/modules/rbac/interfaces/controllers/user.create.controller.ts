import { Body, Controller, Post } from '@nestjs/common';
import { UserView } from '@app/contracts';
import { CreateUserUseCase } from '../../application/use-cases/create-user.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { CreateUserDto } from '../dto/create-user.dto';

/** 路由：新建用户 */
@Controller('rbac/users')
export class UserCreateController {
  constructor(private readonly useCase: CreateUserUseCase) {}

  @Post()
  @Permissions(PERMS.user.create)
  create(@Body() dto: CreateUserDto): Promise<UserView> {
    return this.useCase.execute(dto);
  }
}
