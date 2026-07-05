import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BOOSTER_DEFAULTS,
  BOOSTER_LEVEL_DEFAULTS,
  BOOSTER_LEVEL_LIMITS,
  BoosterLevelTier,
  CONFIG_KEYS,
  FEE_RATE_BASE,
} from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';

/**
 * 打手策略服务（配置读写收口）。
 * 等级档位 / 应缴押金 / 实名前置开关全部存配置中心，杜绝硬编码；
 * 写入前做档位合法性校验，读取时缺省回退契约默认值。
 */
@Injectable()
export class BoosterPolicyService {
  constructor(private readonly config: ConfigService) {}

  /** 取等级档位（按完成单数门槛升序） */
  async getLevelTiers(): Promise<BoosterLevelTier[]> {
    const tiers = await this.config.getJson<BoosterLevelTier[]>(
      CONFIG_KEYS.booster.levels,
      BOOSTER_LEVEL_DEFAULTS,
    );
    return (tiers.length > 0 ? tiers : BOOSTER_LEVEL_DEFAULTS)
      .slice()
      .sort((a, b) => a.minCompletedOrders - b.minCompletedOrders);
  }

  /** 保存等级档位（管理端），校验后写入配置中心 */
  async setLevelTiers(tiers: BoosterLevelTier[]): Promise<BoosterLevelTier[]> {
    this.validateTiers(tiers);
    const sorted = tiers
      .slice()
      .sort((a, b) => a.minCompletedOrders - b.minCompletedOrders)
      .map((tier, index) => ({ ...tier, level: index + 1 }));
    await this.config.setJson(CONFIG_KEYS.booster.levels, sorted);
    return sorted;
  }

  /** 应缴押金总额（分） */
  getDepositRequiredFen(): Promise<number> {
    return this.config.getNumber(
      CONFIG_KEYS.booster.depositFen,
      BOOSTER_DEFAULTS.depositFen,
    );
  }

  /** 提交入驻申请是否要求已通过实名认证 */
  isRealnameRequired(): Promise<boolean> {
    return this.config.getBoolean(
      CONFIG_KEYS.booster.requireRealname,
      BOOSTER_DEFAULTS.requireRealname,
    );
  }

  /** 档位合法性校验：非空、数量上限、名称必填、费率与门槛范围 */
  private validateTiers(tiers: BoosterLevelTier[]): void {
    if (tiers.length === 0 || tiers.length > BOOSTER_LEVEL_LIMITS.tiersMax) {
      throw new BadRequestException(
        `等级档位数量须在 1~${BOOSTER_LEVEL_LIMITS.tiersMax} 之间`,
      );
    }
    for (const tier of tiers) {
      if (!tier.name.trim()) {
        throw new BadRequestException('等级名称不能为空');
      }
      if (tier.minCompletedOrders < 0) {
        throw new BadRequestException('完成单数门槛不能为负数');
      }
      if (tier.commissionRateBp < 0 || tier.commissionRateBp > FEE_RATE_BASE) {
        throw new BadRequestException(
          `提成比例须在 0~${FEE_RATE_BASE}（万分比）之间`,
        );
      }
    }
  }
}
