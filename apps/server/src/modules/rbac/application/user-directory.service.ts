import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../domain/user-repository.interface';

/** 用户简要信息（仅展示所需字段，跨模块共享时避免泄露敏感字段） */
export interface UserBrief {
  id: string;
  username: string;
}

/** 用户展示资料（用户名 + 昵称），供需要显示提交人/成员的模块使用 */
export interface UserProfileBrief {
  username: string;
  nickname: string;
}

/**
 * 用户目录服务。
 * 对外只暴露按 id 取用户名等只读查询，供 IM 等模块解析成员显示名，
 * 避免其他模块直接依赖 User 实体或仓储细节。
 */
@Injectable()
export class UserDirectory {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  /** 批量解析用户名，返回 id → username 映射（不存在的 id 不在表中） */
  async resolveNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    const rows = await this.users.findByIds(unique);
    return new Map(rows.map((u) => [u.id, u.username]));
  }

  /** 校验给定 id 是否都存在，返回存在的简要信息 */
  async findBriefs(ids: string[]): Promise<UserBrief[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    const rows = await this.users.findByIds(unique);
    return rows.map((u) => ({ id: u.id, username: u.username }));
  }

  /** 批量解析用户展示资料，返回 id → { username, nickname } 映射 */
  async resolveProfiles(ids: string[]): Promise<Map<string, UserProfileBrief>> {
    const unique = [...new Set(ids.filter(Boolean))];
    const rows = await this.users.findByIds(unique);
    return new Map(
      rows.map((u) => [u.id, { username: u.username, nickname: u.nickname }]),
    );
  }
}
