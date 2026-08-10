import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BOOSTER_DEFAULTS,
  BOOSTER_LEVEL_DEFAULTS,
  BOOSTER_LEVEL_LIMITS,
  BOOSTER_SERVICE_REGION_LIMITS,
  BOOSTER_SERVICE_REGIONS,
  BoosterDepositPolicy,
  BoosterLevelTier,
  BoosterServiceRegionOption,
  CONFIG_KEYS,
  FEE_RATE_BASE,
  sanitizeBoosterServiceRegionOptions,
} from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';

/**
 * 打手策略服务（配置读写收口）。
 * 等级档位 / 押金交付策略（最低/最高）/ 实名前置开关全部存配置中心，杜绝硬编码；
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

  /** 押金交付策略（最低交付额为接单门槛，最高交付额为缴纳上限） */
  async getDepositPolicy(): Promise<BoosterDepositPolicy> {
    const [minFen, maxFen] = await Promise.all([
      this.config.getNumber(
        CONFIG_KEYS.booster.depositMinFen,
        BOOSTER_DEFAULTS.depositMinFen,
      ),
      this.config.getNumber(
        CONFIG_KEYS.booster.depositMaxFen,
        BOOSTER_DEFAULTS.depositMaxFen,
      ),
    ]);
    return { minFen, maxFen };
  }

  /** 保存押金交付策略（管理端），校验后写入配置中心 */
  async setDepositPolicy(
    policy: BoosterDepositPolicy,
  ): Promise<BoosterDepositPolicy> {
    if (policy.minFen < 0 || policy.maxFen < 0) {
      throw new BadRequestException('押金金额不能为负数');
    }
    if (policy.maxFen < policy.minFen) {
      throw new BadRequestException('最高交付额不得低于最低交付额');
    }
    await Promise.all([
      this.config.setRaw(
        CONFIG_KEYS.booster.depositMinFen,
        String(policy.minFen),
      ),
      this.config.setRaw(
        CONFIG_KEYS.booster.depositMaxFen,
        String(policy.maxFen),
      ),
    ]);
    return policy;
  }

  /** 提交入驻申请是否要求已通过实名认证 */
  isRealnameRequired(): Promise<boolean> {
    return this.config.getBoolean(
      CONFIG_KEYS.booster.requireRealname,
      BOOSTER_DEFAULTS.requireRealname,
    );
  }

  /** C 端入驻公告图片（由管理端配置中心维护） */
  getOnboardingNoticeImage(): Promise<string> {
    return this.config.getString(CONFIG_KEYS.booster.onboardingNoticeImage, '');
  }

  /** C 端入驻公告文本（由管理端配置中心维护，与主页公告独立） */
  getOnboardingNoticeText(): Promise<string> {
    return this.config.getString(CONFIG_KEYS.booster.onboardingNoticeText, '');
  }

  /** 接单区服选项（管理端打手管理可视化配置；未配置或配置非法时回退默认两个区服） */
  async getServiceRegionOptions(): Promise<BoosterServiceRegionOption[]> {
    const raw = await this.config.getJson<BoosterServiceRegionOption[]>(
      CONFIG_KEYS.booster.serviceRegionOptions,
      [...BOOSTER_SERVICE_REGIONS],
    );
    return sanitizeBoosterServiceRegionOptions(raw);
  }

  /** 保存接单区服选项（管理端），校验后写入配置中心 */
  async setServiceRegionOptions(
    options: BoosterServiceRegionOption[],
  ): Promise<BoosterServiceRegionOption[]> {
    const sanitized = options.map((option) => ({
      value: option.value.trim(),
      label: option.label.trim(),
    }));
    this.validateRegionOptions(sanitized);
    await this.config.setJson(
      CONFIG_KEYS.booster.serviceRegionOptions,
      sanitized,
    );
    return sanitized;
  }

  /** 区服选项合法性校验：数量、值字符集与长度、名称必填、值唯一 */
  private validateRegionOptions(options: BoosterServiceRegionOption[]): void {
    if (
      options.length === 0 ||
      options.length > BOOSTER_SERVICE_REGION_LIMITS.optionsMax
    ) {
      throw new BadRequestException(
        `区服选项数量须在 1~${BOOSTER_SERVICE_REGION_LIMITS.optionsMax} 之间`,
      );
    }
    const seen = new Set<string>();
    for (const option of options) {
      if (
        !option.value ||
        option.value.length > BOOSTER_SERVICE_REGION_LIMITS.valueMax ||
        !BOOSTER_SERVICE_REGION_LIMITS.valuePattern.test(option.value)
      ) {
        throw new BadRequestException(
          '区服值仅允许小写字母/数字/短横线且不能为空',
        );
      }
      if (
        !option.label ||
        option.label.length > BOOSTER_SERVICE_REGION_LIMITS.labelMax
      ) {
        throw new BadRequestException(
          `区服名称必填且不超过 ${BOOSTER_SERVICE_REGION_LIMITS.labelMax} 字`,
        );
      }
      if (seen.has(option.value)) {
        throw new BadRequestException(`区服值重复：${option.value}`);
      }
      seen.add(option.value);
    }
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
