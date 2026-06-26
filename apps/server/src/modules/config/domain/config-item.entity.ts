import { ConfigGroup, ConfigValueType } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';

/**
 * 配置项聚合根。
 * 配置中心是“除数据库连接外所有配置的唯一来源”，每条配置以 key 唯一标识。
 */
@Entity('sys_config')
export class ConfigItem extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 128 })
  key!: string;

  /** 统一以文本存储，读取时按 type 反序列化 */
  @Column({ type: 'text' })
  value!: string;

  @Column({ type: 'varchar', length: 16, default: ConfigValueType.String })
  type!: ConfigValueType;

  @Column({ type: 'varchar', length: 32, default: ConfigGroup.System })
  group!: ConfigGroup;

  @Column({ length: 255, default: '' })
  remark!: string;

  /** 敏感配置（密钥等）对外列表脱敏，不回显原值 */
  @Column({ default: false })
  secret!: boolean;
}
