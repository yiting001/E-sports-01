import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RbacModule } from '../rbac/rbac.module';
import { OrderEntity } from '../order/domain/order.entity';
import { MemberProfileEntity } from '../member/domain/member-profile.entity';
import { User } from '../rbac/domain/user.entity';

import { RANK_REPOSITORY } from './domain/rank-repository.interface';
import { TypeormRankRepository } from './infrastructure/rank.repository';
import { GetRankBoardUseCase } from './application/use-cases/get-rank-board.usecase';
import { RankBoardController } from './interfaces/controllers/rank.board.controller';

/**
 * 排行榜模块。
 * 纯只读聚合既有订单/会员档案数据（不落新表）：
 * 打手榜按完成单数、消费榜按累计消费，登录即可查看，昵称脱敏展示。
 */
@Module({
  imports: [
    RbacModule,
    TypeOrmModule.forFeature([OrderEntity, MemberProfileEntity, User]),
  ],
  controllers: [RankBoardController],
  providers: [
    { provide: RANK_REPOSITORY, useClass: TypeormRankRepository },
    GetRankBoardUseCase,
  ],
})
export class RankModule {}
