import { Inject, Injectable } from '@nestjs/common';
import { BoosterLevelTier, resolveBoosterLevel } from '@app/contracts';
import { BOOSTER_REPOSITORY, BoosterRepository } from '../domain/booster-repository.interface';
import { BoosterPolicyService } from './booster-policy.service';

/**
 * 打手进度服务（模块对外口，供订单模块在完成结算时调用）。
 * 记录订单完成 → 递增累计完成单数 → 按配置档位解析结算所用等级费率；
 * 定级用「完成本单前」的等级，本单完成后才计入晋升进度。
 */
@Injectable()
export class BoosterProgressService {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly policy: BoosterPolicyService,
  ) {}

  /**
   * 登记一次订单完成，返回本单结算适用的等级档位；
   * 用户无入驻记录时（历史数据兜底）返回最低档。
   */
  async recordCompletedOrder(userId: string): Promise<BoosterLevelTier> {
    const tiers = await this.policy.getLevelTiers();
    const previousCompletedOrders = await this.repo.recordCompletedOrder(userId);
    return resolveBoosterLevel(tiers, previousCompletedOrders ?? 0);
  }
}
