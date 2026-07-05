import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  FEE_RATE_BASE,
  MEMBER_LEVEL_DEFAULTS,
  MEMBER_LEVEL_LIMITS,
  MemberLevelTier,
  MemberMineView,
  fenToYuan,
  nextMemberTier,
  resolveMemberLevel,
} from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import {
  MEMBER_REPOSITORY,
  MemberRepository,
} from '../domain/member-repository.interface';

/**
 * 会员等级服务（模块对外口）。
 * 档位存配置中心（管理端可编辑，写入前校验），等级按累计消费实时解析；
 * 对外提供「取用户当前折扣」供订单模块下单时计算应付金额。
 */
@Injectable()
export class MemberLevelService {
  constructor(
    private readonly config: ConfigService,
    @Inject(MEMBER_REPOSITORY)
    private readonly repo: MemberRepository,
  ) {}

  /** 取会员档位（按消费门槛升序） */
  async getTiers(): Promise<MemberLevelTier[]> {
    const tiers = await this.config.getJson<MemberLevelTier[]>(
      CONFIG_KEYS.member.levels,
      MEMBER_LEVEL_DEFAULTS,
    );
    return (tiers.length > 0 ? tiers : MEMBER_LEVEL_DEFAULTS)
      .slice()
      .sort((a, b) => a.minSpendFen - b.minSpendFen);
  }

  /** 保存会员档位（管理端），校验后写入配置中心并按门槛重排等级序号 */
  async setTiers(tiers: MemberLevelTier[]): Promise<MemberLevelTier[]> {
    this.validateTiers(tiers);
    const sorted = tiers
      .slice()
      .sort((a, b) => a.minSpendFen - b.minSpendFen)
      .map((tier, index) => ({ ...tier, level: index + 1 }));
    await this.config.setJson(CONFIG_KEYS.member.levels, sorted);
    return sorted;
  }

  /** 取用户当前会员档位（下单折扣计算用，未消费用户为最低档） */
  async resolveForUser(userId: string): Promise<MemberLevelTier> {
    const [tiers, profile] = await Promise.all([
      this.getTiers(),
      this.repo.findByUserId(userId),
    ]);
    return resolveMemberLevel(tiers, profile?.spendFen ?? 0);
  }

  /** 组装当前用户会员概览（等级、折扣、累计消费、晋升进度） */
  async getMineView(userId: string): Promise<MemberMineView> {
    const [tiers, profile] = await Promise.all([
      this.getTiers(),
      this.repo.findByUserId(userId),
    ]);
    const spendFen = profile?.spendFen ?? 0;
    const tier = resolveMemberLevel(tiers, spendFen);
    const next = nextMemberTier(tiers, spendFen);
    return {
      level: tier.level,
      levelName: tier.name,
      discountBp: tier.discountBp,
      spendFen,
      spendYuan: fenToYuan(spendFen),
      nextLevelName: next?.name ?? '',
      nextNeedFen: next ? next.minSpendFen - spendFen : 0,
    };
  }

  /** 档位合法性校验：非空、数量上限、名称必填、折扣与门槛范围 */
  private validateTiers(tiers: MemberLevelTier[]): void {
    if (tiers.length === 0 || tiers.length > MEMBER_LEVEL_LIMITS.tiersMax) {
      throw new BadRequestException(
        `会员档位数量须在 1~${MEMBER_LEVEL_LIMITS.tiersMax} 之间`,
      );
    }
    for (const tier of tiers) {
      if (!tier.name.trim()) {
        throw new BadRequestException('等级名称不能为空');
      }
      if (tier.minSpendFen < 0) {
        throw new BadRequestException('消费门槛不能为负数');
      }
      if (tier.discountBp <= 0 || tier.discountBp > FEE_RATE_BASE) {
        throw new BadRequestException(
          `折扣须在 1~${FEE_RATE_BASE}（万分比）之间`,
        );
      }
    }
  }
}
