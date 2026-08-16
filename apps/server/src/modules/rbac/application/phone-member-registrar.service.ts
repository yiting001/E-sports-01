import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { MEMBER_ROLE } from '../domain/rbac.constants';
import { ROLE_REPOSITORY, RoleRepository } from '../domain/role-repository.interface';
import { USER_REPOSITORY, UserRepository } from '../domain/user-repository.interface';
import { User } from '../domain/user.entity';
import { PasswordService } from '../infrastructure/password.service';

/**
 * 手机号会员注册服务。
 * 以手机号创建启用账号、默认分配 member（普通用户）角色；
 * 账号无口令：写入不可逆随机口令哈希，使其无法通过账号密码登录，只能短信登录。
 * 供短信注册与短信登录（首登自动注册）复用，收敛注册规则于一处。
 */
@Injectable()
export class PhoneMemberRegistrar {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    private readonly password: PasswordService,
  ) {}

  async register(phone: string, tenantId: string, nickname?: string): Promise<User> {
    const memberRole = await this.roleRepo.findByCodeForTenant(MEMBER_ROLE, tenantId);
    if (!memberRole) {
      throw new InternalServerErrorException('缺少默认用户角色，请联系管理员');
    }
    const username = await this.generateUsername(phone, tenantId);
    const entity = this.userRepo.create({
      username,
      passwordHash: await this.password.hash(randomBytes(32).toString('hex')),
      nickname: nickname ?? `用户${phone.slice(-4)}`,
      phone,
      roles: [memberRole],
      tenantId,
    });
    return this.userRepo.save(entity);
  }

  /**
   * 生成租户内唯一用户名。
   * 以手机号派生（sms_<phone>）保证可读，命中占用时追加短随机后缀重试。
   */
  private async generateUsername(phone: string, tenantId: string): Promise<string> {
    const base = `sms_${phone}`;
    if (!(await this.userRepo.existsByUsername(base, tenantId))) {
      return base;
    }
    for (let i = 0; i < 5; i += 1) {
      const candidate = `${base}_${randomBytes(2).toString('hex')}`;
      if (!(await this.userRepo.existsByUsername(candidate, tenantId))) {
        return candidate;
      }
    }
    throw new ConflictException('用户名生成失败，请重试');
  }
}
