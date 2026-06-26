import { PermissionType } from '@app/contracts';
import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { Role } from './role.entity';

/**
 * 权限实体（统一权限树）。
 * 菜单/按钮/接口统一建模为一棵权限树，用 type 区分颗粒度，
 * 避免为菜单单独建表造成冗余（低冗余原则）。
 */
@Entity('rbac_permission')
export class Permission extends BaseEntity {
  /** 父节点 id，根节点为 null，构成权限树 */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @Index({ unique: true })
  @Column({ length: 128 })
  code!: string;

  @Column({ length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: PermissionType;

  /** 菜单路由路径（type=menu 时有效） */
  @Column({ type: 'varchar', length: 191, nullable: true })
  path!: string | null;

  /** 前端组件路径（type=menu 时有效） */
  @Column({ type: 'varchar', length: 191, nullable: true })
  component!: string | null;

  /** 接口方法（type=api 时有效），如 POST */
  @Column({ name: 'api_method', type: 'varchar', length: 16, nullable: true })
  apiMethod!: string | null;

  /** 接口路径（type=api 时有效），如 /config */
  @Column({ name: 'api_path', type: 'varchar', length: 191, nullable: true })
  apiPath!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  icon!: string | null;

  @Column({ type: 'int', default: 0 })
  sort!: number;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
