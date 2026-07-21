import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * 持久化实体基类。
 * 统一主键与审计字段，所有聚合根/实体继承它，避免在每张表重复定义。
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  /** 持久化版本标记；并发安全仍须由仓储条件更新或事务行锁保证。 */
  @VersionColumn()
  version!: number;
}
