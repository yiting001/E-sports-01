import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 商品分类聚合根。
 * 一级归类商品（如「大红单」「护航单」），管理端维护、C 端只读展示。
 * 停用（enabled=false）后 C 端不展示该分类及其下商品。
 */
@Entity('commerce_category')
export class CategoryEntity extends TenantScopedEntity {
  /** 分类名 */
  @Index()
  @Column({ length: 64 })
  name!: string;

  /** 封面短标语（无图标图片时作为「文字图标」展示），可空 */
  @Column({ length: 64, default: '' })
  cover!: string;

  /** 图标图片 URL（设置后 C 端以「图片图标」展示），可空 */
  @Column({ length: 512, default: '' })
  icon!: string;

  /** 排序值，越小越靠前 */
  @Column({ type: 'int', default: 0 })
  sort!: number;

  /** 是否启用 */
  @Column({ default: true })
  enabled!: boolean;
}
