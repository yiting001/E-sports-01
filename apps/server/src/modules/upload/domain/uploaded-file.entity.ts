import { StorageDriver } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';

/**
 * 文件记录聚合根。
 * 仅持久化元数据（不存二进制），真实字节由具体存储驱动保管，
 * 通过 key 关联存储对象，driver 标识它由哪种存储保存以便删除时复用同一驱动。
 */
@Entity('sys_uploaded_file')
export class UploadedFileEntity extends BaseEntity {
  /** 存储对象 key（相对路径/对象名），同一驱动内唯一 */
  @Index()
  @Column({ length: 512 })
  key!: string;

  /** 对外可访问 URL */
  @Column({ length: 1024 })
  url!: string;

  /** 原始文件名 */
  @Column({ length: 255 })
  filename!: string;

  /** 字节大小 */
  @Column({ type: 'bigint' })
  size!: number;

  @Column({ length: 128 })
  mimeType!: string;

  /** 保存该文件的存储驱动 */
  @Column({ type: 'varchar', length: 16 })
  driver!: StorageDriver;

  /** 上传者用户 ID */
  @Index()
  @Column({ length: 36 })
  uploaderId!: string;
}
