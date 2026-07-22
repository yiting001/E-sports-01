import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SmsRegisterPayload, TokenPair } from '@app/contracts';
import { SmsCodeService } from '../../../sms/application/sms-code.service';
import { SmsCodePurpose } from '../../../sms/domain/sms-code-scope';
import { MEMBER_ROLE } from '../../domain/rbac.constants';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role-repository.interface';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { PasswordService } from '../../infrastructure/password.service';
import { TenantResolver } from '../tenant-resolver.service';
import { TokenService } from '../token.service';

/**
 * 用例：短信验证码注册。
 * 校验并消费验证码后，以手机号创建启用账号、默认分配 member（普通用户）角色，并直接签发令牌。
 * 短信注册的账号无口令：写入不可逆随机口令哈希，使其无法通过账号密码登录，只能短信登录。
 */
@Injectable()
export class SmsRegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    private readonly smsCode: SmsCodeService,
    private readonly password: PasswordService,
    private readonly token: TokenService,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(payload: SmsRegisterPayload): Promise<TokenPair> {
    const tenantId = await this.tenants.resolveForWrite(payload.tenantCode);
    const valid = await this.smsCode.verify(payload.phone, payload.code, {
      purpose: SmsCodePurpose.Register,
      tenantId,
    });
    if (!valid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    if (await this.userRepo.existsByPhone(payload.phone, undefined, tenantId)) {
      throw new ConflictException('该手机号已注册，请直接登录');
    }
    const memberRole = await this.roleRepo.findByCode(MEMBER_ROLE);
    if (!memberRole) {
      throw new InternalServerErrorException('缺少默认用户角色，请联系管理员');
    }
    const username = await this.generateUsername(payload.phone, tenantId);
    const entity = this.userRepo.create({
      username,
      passwordHash: await this.password.hash(randomBytes(32).toString('hex')),
      nickname: payload.nickname ?? `用户${payload.phone.slice(-4)}`,
      phone: payload.phone,
      roles: [memberRole],
      tenantId,
    });
    const saved = await this.userRepo.save(entity);
    return this.token.issueTokenPair(saved.id, saved.username, saved.tenantId);
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
