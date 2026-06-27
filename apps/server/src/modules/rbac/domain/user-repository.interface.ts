import { User } from './user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/** 用户仓储接口 */
export interface UserRepository {
  /** 含角色关系；不含密码哈希 */
  findById(id: string): Promise<User | null>;
  /** 批量按 id 取用户（用于会话成员名等展示场景） */
  findByIds(ids: string[]): Promise<User[]>;
  /** 登录用：显式选出密码哈希 */
  findByUsernameWithPassword(username: string): Promise<User | null>;
  /** 短信登录用：按手机号取启用中的用户（含角色） */
  findByPhone(phone: string): Promise<User | null>;
  existsByUsername(username: string): Promise<boolean>;
  /** 校验手机号是否已被其他用户绑定（excludeUserId 用于编辑时排除自身） */
  existsByPhone(phone: string, excludeUserId?: string): Promise<boolean>;
  paginate(skip: number, take: number, keyword?: string): Promise<[User[], number]>;
  create(data: Partial<User>): User;
  save(user: User): Promise<User>;
  remove(id: string): Promise<void>;
}
