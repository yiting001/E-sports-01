import { CategoryEntity } from './category.entity';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

/** 分类仓储接口（领域层只依赖抽象，实现在基础设施层，读操作按租户上下文过滤） */
export interface CategoryRepository {
  /** 按主键取分类 */
  findById(id: string): Promise<CategoryEntity | null>;
  /** 批量按主键取分类（用于商品列表解析分类名） */
  findByIds(ids: string[]): Promise<CategoryEntity[]>;
  /** 分页查询分类，按 sort 升序、创建时间倒序 */
  paginate(skip: number, take: number): Promise<[CategoryEntity[], number]>;
  /** 列出启用中的分类（C 端展示用），按 sort 升序 */
  listEnabled(): Promise<CategoryEntity[]>;
  /** 统计各分类下的商品数，返回 categoryId → count 映射 */
  countProducts(categoryIds: string[]): Promise<Map<string, number>>;
  /** 同租户下是否存在同名分类（可排除指定 id，用于更新时校验） */
  existsByName(name: string, excludeId?: string): Promise<boolean>;
  create(data: Partial<CategoryEntity>): CategoryEntity;
  save(entity: CategoryEntity): Promise<CategoryEntity>;
  remove(entity: CategoryEntity): Promise<void>;
}
