import { Inject, Injectable } from '@nestjs/common';
import { RealnameStatus } from '@app/contracts';
import {
  REALNAME_REPOSITORY,
  RealnameRepository,
} from '../domain/realname-repository.interface';

/**
 * 实名结论查询服务（模块对外最小只读口）。
 * 供打手入驻等业务判断「用户实名是否已通过」，
 * 避免其他模块直接依赖实名实体或仓储细节。
 */
@Injectable()
export class RealnameChecker {
  constructor(
    @Inject(REALNAME_REPOSITORY)
    private readonly repo: RealnameRepository,
  ) {}

  /** 用户实名认证是否已审核通过 */
  async isApproved(userId: string): Promise<boolean> {
    const record = await this.repo.findByUserId(userId);
    return record?.status === RealnameStatus.Approved;
  }
}
