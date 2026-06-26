import { Body, Controller, Param, Patch } from '@nestjs/common';
import { UserView } from '@app/contracts';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { UpdateUserDto } from '../dto/update-user.dto';

/** 路由：更新用户基础信息 */
@Controller('rbac/users')
export class UserUpdateController {
  constructor(private readonly useCase: UpdateUserUseCase) {}

  @Patch(':id')
  @Permissions(PERMS.user.update)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserView> {
    return this.useCase.execute(id, dto);
  }
}
