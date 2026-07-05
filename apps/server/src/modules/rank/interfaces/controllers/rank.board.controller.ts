import { Controller, Get } from '@nestjs/common';
import { RankBoardView } from '@app/contracts';
import { GetRankBoardUseCase } from '../../application/use-cases/get-rank-board.usecase';

/** 路由：查询排行榜（GET /rank/board）；仅登录态，所有角色可用 */
@Controller('rank')
export class RankBoardController {
  constructor(private readonly useCase: GetRankBoardUseCase) {}

  @Get('board')
  board(): Promise<RankBoardView> {
    return this.useCase.execute();
  }
}
