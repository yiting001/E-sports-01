import { Controller, Get } from '@nestjs/common';
import { MenuView } from '@app/contracts';
import { GetMyMenusUseCase } from '../../application/use-cases/get-my-menus.usecase';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/metadata';

/** 路由：查询当前登录用户的可见菜单（按其权限过滤，超管全量） */
@Controller('rbac/menus')
export class MenuMineController {
  constructor(private readonly useCase: GetMyMenusUseCase) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<MenuView[]> {
    return this.useCase.execute(user.id);
  }
}
