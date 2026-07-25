import { ProductStatus } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';

/**
 * 商品（陪玩单）聚合根。
 * 归属某个分类，可关联一名负责客服（下单后由其处理/拉群），支持上下架与排序。
 * 价格统一以「分」存储，避免浮点误差。
 */
@Entity('commerce_product')
export class ProductEntity extends TenantScopedEntity {
  /** 所属分类 id */
  @Index()
  @Column({ name: 'category_id', length: 36 })
  categoryId!: string;

  /** 商品名 */
  @Index()
  @Column({ length: 128 })
  title!: string;

  /** 封面图片 URL；未设置为空串 */
  @Column({ length: 512, default: '' })
  cover!: string;

  /** 封面主标语 */
  @Column({ name: 'cover_title', length: 128, default: '' })
  coverTitle!: string;

  /** 封面副标语 */
  @Column({ name: 'cover_sub', length: 128, default: '' })
  coverSub!: string;

  /** 卖点描述 */
  @Column({ type: 'text', default: '' })
  description!: string;

  /** 现价（分） */
  @Column({ name: 'price_fen', type: 'int', default: 0 })
  priceFen!: number;

  /** 划线原价（分） */
  @Column({ name: 'origin_price_fen', type: 'int', default: 0 })
  originPriceFen!: number;

  /** 电脑端现价（分） */
  @Column({ name: 'pc_price_fen', type: 'int', default: 0 })
  pcPriceFen!: number;

  /** 电脑端划线原价（分） */
  @Column({ name: 'pc_origin_price_fen', type: 'int', default: 0 })
  pcOriginPriceFen!: number;

  /** 已售数量 */
  @Column({ type: 'int', default: 0 })
  sold!: number;

  /** 关联负责客服的用户 id；未关联为空串 */
  @Column({ name: 'service_agent_id', length: 36, default: '' })
  serviceAgentId!: string;

  /** 上下架状态 */
  @Column({ type: 'varchar', length: 16, default: ProductStatus.OffShelf })
  status!: ProductStatus;

  /** 排序值，越小越靠前 */
  @Column({ type: 'int', default: 0 })
  sort!: number;
}
