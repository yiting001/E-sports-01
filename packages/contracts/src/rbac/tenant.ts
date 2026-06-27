/**
 * 多租户（前后端共享单一来源）。
 * 行级隔离：租户域数据（用户/角色/会话/消息/上传/日志）带 tenantId，
 * 由租户上下文自动回填与过滤；平台超管跨租户、租户管理员仅限本租户。
 */

/** 租户状态 */
export enum TenantStatus {
  Enabled = 'enabled',
  Disabled = 'disabled',
}

/** 内置默认租户编码：现有数据归属它，平台超管属于它 */
export const DEFAULT_TENANT_CODE = 'default';

/**
 * 内置默认租户的固定主键。
 * 作为租户域各表 tenant_id 列的数据库默认值——既让历史行随建列自动归入默认租户、
 * 又让无请求上下文（启动/播种）写入的数据落到默认租户，实现零数据迁移。
 */
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/** 租户对外视图 */
export interface TenantView {
  id: string;
  /** 租户编码（登录、隔离标识），全局唯一、不可变 */
  code: string;
  /** 租户名称 */
  name: string;
  status: TenantStatus;
  remark: string;
  /** 是否内置默认租户：内置租户不可删除/禁用 */
  builtin: boolean;
  createdAt: string;
}

/** 创建租户入参 */
export interface CreateTenantPayload {
  code: string;
  name: string;
  remark?: string;
  /** 初始管理员账号（选填，默认 `<code>_admin`） */
  adminUsername?: string;
  /** 初始管理员密码（选填，默认平台约定值） */
  adminPassword?: string;
}

/** 更新租户入参（编码不可改） */
export interface UpdateTenantPayload {
  name?: string;
  status?: TenantStatus;
  remark?: string;
}
