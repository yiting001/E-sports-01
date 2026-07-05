import { Body, Controller, Param, Put } from '@nestjs/common';
import { BoosterView, PERMS } from '@app/contracts';
import { UpdateBoosterUseCase } from '../../application/use-cases/update-booster.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpdateBoosterDto } from '../dto/update-booster.dto';

/**
 * 路由：管理端编辑打手资料（PUT /booster/:id）。
 * 需 booster:update 权限；仅更新传入字段，不改变审核状态。
 */
@Controller('booster')
export class BoosterUpdateController {
  constructor(private readonly useCase: UpdateBoosterUseCase) {}

  @Put(':id')
  @Permissions(PERMS.booster.update)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBoosterDto,
  ): Promise<BoosterView> {
    return this.useCase.execute(id, dto);
  }
}
