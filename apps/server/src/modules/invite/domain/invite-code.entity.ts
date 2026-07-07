import { INVITE_LIMITS } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 邀请码实体：每个用户一个固定邀请码（首次访问邀请页时惰性生成）。
 * code 全局唯一，好友填码即可定位邀请人。
 */
@Entity('invite_code')
export class InviteCodeEntity extends TenantScopedEntity {
  /** 归属用户 id（一人一码） */
  @Index({ unique: true })
  @Column({ name: 'user_id', length: 36 })
  userId!: string;

  /** 邀请码（大写字母+数字，去除易混淆字符） */
  @Index({ unique: true })
  @Column({ length: INVITE_LIMITS.codeLength })
  code!: string;
}
