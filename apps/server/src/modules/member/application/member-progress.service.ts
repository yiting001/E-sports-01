import { Inject, Injectable } from '@nestjs/common';
import {
  MEMBER_REPOSITORY,
  MemberRepository,
} from '../domain/member-repository.interface';

/**
 * 会员进度服务（模块对外口，供订单模块在支付成功时调用）。
 * 按实付金额累加累计消费，达到档位门槛即自动晋升（读取时实时解析）。
 */
@Injectable()
export class MemberProgressService {
  constructor(
    @Inject(MEMBER_REPOSITORY)
    private readonly repo: MemberRepository,
  ) {}

  /** 登记一笔实付消费（分） */
  async recordSpend(userId: string, amountFen: number): Promise<void> {
    if (amountFen <= 0) {
      return;
    }
    await this.repo.increaseSpend(userId, amountFen);
  }
}
