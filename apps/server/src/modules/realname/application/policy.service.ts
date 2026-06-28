import { Injectable } from '@nestjs/common';
import { REALNAME_REQUIRED_ROLES_KEY } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';

/**
 * 实名策略服务。
 * 「哪些角色需实名」存于配置中心（JSON 角色码数组），本服务封装读写，
 * 并提供「给定角色码集合是否命中需实名」的判定，杜绝各处散读配置。
 */
@Injectable()
export class RealnamePolicyService {
  constructor(private readonly config: ConfigService) {}

  /** 读取需实名的角色 code 集合 */
  async getRequiredRoleCodes(): Promise<string[]> {
    return this.config.getJson<string[]>(REALNAME_REQUIRED_ROLES_KEY, []);
  }

  /** 覆盖写入需实名的角色 code 集合（去重） */
  async setRequiredRoleCodes(codes: string[]): Promise<string[]> {
    const unique = [...new Set(codes.filter(Boolean))];
    await this.config.setJson(REALNAME_REQUIRED_ROLES_KEY, unique);
    return unique;
  }

  /** 给定用户角色码集合，判断是否被要求实名（任一角色命中即需实名） */
  async isRequiredForRoles(roleCodes: string[]): Promise<boolean> {
    const required = await this.getRequiredRoleCodes();
    if (required.length === 0) {
      return false;
    }
    const set = new Set(required);
    return roleCodes.some((code) => set.has(code));
  }
}
